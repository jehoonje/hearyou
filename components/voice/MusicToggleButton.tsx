// src/components/voice/MusicToggleButton.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Music } from 'lucide-react';

interface MusicToggleButtonProps {
  className?: string;
}

const MusicToggleButton: React.FC<MusicToggleButtonProps> = ({ 
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const musicTracks = [
    '/assets/music-1.mp3',
    '/assets/music-2.mp3',
    '/assets/music-3.mp3',
    '/assets/music-4.mp3',
    '/assets/music-5.mp3'
  ];

  // 페이드인 효과
  const fadeIn = (targetVolume: number = 0.5, duration: number = 1000) => {
    if (!audioRef.current) return;

    const steps = 50;
    const stepTime = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    audioRef.current.volume = 0;
    
    fadeIntervalRef.current = setInterval(() => {
      if (!audioRef.current) return;

      currentStep++;
      const newVolume = volumeStep * currentStep;
      
      audioRef.current.volume = Math.min(newVolume, targetVolume);

      if (currentStep >= steps || audioRef.current.volume >= targetVolume) {
        clearInterval(fadeIntervalRef.current!);
        fadeIntervalRef.current = null;
      }
    }, stepTime);
  };

  // 페이드아웃 효과
  const fadeOut = (duration: number = 1000): Promise<void> => {
    if (!audioRef.current) return Promise.resolve();

    const steps = 50;
    const stepTime = duration / steps;
    const startVolume = audioRef.current.volume;
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    return new Promise<void>((resolve) => {
      fadeIntervalRef.current = setInterval(() => {
        if (!audioRef.current) {
          resolve();
          return;
        }

        currentStep++;
        const newVolume = startVolume - (volumeStep * currentStep);
        
        audioRef.current.volume = Math.max(newVolume, 0);

        if (currentStep >= steps || audioRef.current.volume <= 0) {
          clearInterval(fadeIntervalRef.current!);
          fadeIntervalRef.current = null;
          resolve();
        }
      }, stepTime);
    });
  };

  // 랜덤으로 다음 트랙 선택
  const getRandomTrack = () => {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * musicTracks.length);
    } while (newIndex === currentTrackIndex && musicTracks.length > 1);
    return newIndex;
  };

  // Audio 객체 초기화
  const initializeAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = 0;
      
      // 트랙이 끝나면 다음 랜덤 트랙 재생
      audioRef.current.addEventListener('ended', () => {
        const nextIndex = getRandomTrack();
        setCurrentTrackIndex(nextIndex);
        audioRef.current!.src = musicTracks[nextIndex];
        audioRef.current!.play().then(() => {
          fadeIn(currentVolume);
        });
      });
    }
  };

  // 음악 재생
  const playMusic = async () => {
    try {
      initializeAudio();
      
      // 새 트랙 설정 또는 현재 트랙 재시작
      if (!audioRef.current!.src || audioRef.current!.ended) {
        const randomIndex = getRandomTrack();
        setCurrentTrackIndex(randomIndex);
        audioRef.current!.src = musicTracks[randomIndex];
      }
      
      // 재생 위치 리셋
      audioRef.current!.currentTime = 0;
      
      await audioRef.current!.play();
      setIsPlaying(true);
      fadeIn(currentVolume, 800);
    } catch (error) {
      console.error('Audio play failed:', error);
      setIsPlaying(false);
    }
  };

  // 음악 정지
  const stopMusic = async () => {
    if (audioRef.current && isPlaying) {
      await fadeOut(800);
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // 음악 재생/정지 토글
  const toggleMusic = () => {
    if (isPlaying) {
      stopMusic();
    } else {
      playMusic();
    }
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={isPlaying ? '음악 정지' : '음악 재생'}
      title={isPlaying ? '음악 정지' : '음악 재생'}
      onClick={toggleMusic}
      className={`circle-toggle-btn ${isPlaying ? 'music-active' : ''} ${className}`}
    >
      <Music size={16} className="circle-toggle-icon" />
    </button>
  );
};

export default MusicToggleButton;