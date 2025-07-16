// src/components/voice/MusicToggleButton.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Music } from 'lucide-react';

interface MusicToggleButtonProps {
  className?: string;
  onMusicStart?: () => void; // 음악 시작 시 마이크 끄기 위한 콜백
  forceStop?: boolean; // 외부에서 강제로 음악 정지
}

const MusicToggleButton: React.FC<MusicToggleButtonProps> = ({ 
  className = '', 
  onMusicStart,
  forceStop = false 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const musicTracks = [
    '/assets/music-1.mp3',
    '/assets/music-2.mp3',
    '/assets/music-3.mp3'
  ];

  // 외부에서 강제 정지 요청 시 처리
  useEffect(() => {
    if (forceStop && isPlaying) {
      fadeOut(500).then(() => {
        setIsPlaying(false);
      });
    }
  }, [forceStop, isPlaying]);

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
      setCurrentVolume(audioRef.current.volume);

      if (currentStep >= steps || audioRef.current.volume >= targetVolume) {
        clearInterval(fadeIntervalRef.current!);
        fadeIntervalRef.current = null;
      }
    }, stepTime);
  };

  // 페이드아웃 효과
  const fadeOut = (duration: number = 1000) => {
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
        if (!audioRef.current) return;

        currentStep++;
        const newVolume = startVolume - (volumeStep * currentStep);
        
        audioRef.current.volume = Math.max(newVolume, 0);
        setCurrentVolume(audioRef.current.volume);

        if (currentStep >= steps || audioRef.current.volume <= 0) {
          clearInterval(fadeIntervalRef.current!);
          fadeIntervalRef.current = null;
          if (audioRef.current) {
            audioRef.current.pause();
          }
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

  // 음악 재생/정지 토글
  const toggleMusic = async () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = 0; // 페이드인을 위해 0으로 시작
      
      // 트랙이 끝나면 다음 랜덤 트랙 재생
      audioRef.current.addEventListener('ended', () => {
        const nextIndex = getRandomTrack();
        setCurrentTrackIndex(nextIndex);
        audioRef.current!.src = musicTracks[nextIndex];
        audioRef.current!.play();
        fadeIn(currentVolume);
      });
    }

    if (isPlaying) {
      // 페이드아웃 후 정지
      await fadeOut(800);
      setIsPlaying(false);
    } else {
      // 음악 시작 시 마이크 끄기
      if (onMusicStart) {
        onMusicStart();
      }
      
      // 재생 후 페이드인
      if (!audioRef.current.src) {
        const randomIndex = getRandomTrack();
        setCurrentTrackIndex(randomIndex);
        audioRef.current.src = musicTracks[randomIndex];
      }
      
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        fadeIn(currentVolume, 800);
      } catch (error) {
        console.error('Audio play failed:', error);
      }
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
      <Music size={20} className="circle-toggle-icon" />
    </button>
  );
};

export default MusicToggleButton;