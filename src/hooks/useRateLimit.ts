import { useState, useRef } from 'react';
import { useToast } from './use-toast';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitState {
  requests: number[];
  blockedUntil?: number;
}

export const useRateLimit = (config: RateLimitConfig) => {
  const { toast } = useToast();
  const state = useRef<RateLimitState>({ requests: [] });

  const checkRateLimit = (operation: string): boolean => {
    const now = Date.now();
    const { requests } = state.current;

    // Check if currently blocked
    if (state.current.blockedUntil && now < state.current.blockedUntil) {
      const remainingMs = state.current.blockedUntil - now;
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      
      toast({
        variant: "destructive",
        title: "Rate limit exceeded",
        description: `Please wait ${remainingSeconds} seconds before trying again.`
      });
      return false;
    }

    // Remove old requests outside the window
    const windowStart = now - config.windowMs;
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (recentRequests.length >= config.maxRequests) {
      const blockDuration = config.blockDurationMs || config.windowMs;
      state.current.blockedUntil = now + blockDuration;
      
      toast({
        variant: "destructive",
        title: "Too many requests",
        description: `Rate limit exceeded for ${operation}. Please try again later.`
      });
      return false;
    }

    // Add current request
    recentRequests.push(now);
    state.current.requests = recentRequests;
    
    return true;
  };

  const getRemainingRequests = (): number => {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const recentRequests = state.current.requests.filter(timestamp => timestamp > windowStart);
    return Math.max(0, config.maxRequests - recentRequests.length);
  };

  const reset = () => {
    state.current = { requests: [] };
  };

  return {
    checkRateLimit,
    getRemainingRequests,
    reset
  };
};

// Predefined rate limit configurations
export const rateLimitConfigs = {
  auth: { maxRequests: 5, windowMs: 5 * 60 * 1000, blockDurationMs: 10 * 60 * 1000 }, // 5 attempts per 5 minutes, block for 10 minutes
  upload: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
  aiChat: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 AI requests per minute
  apiCall: { maxRequests: 50, windowMs: 60 * 1000 } // 50 API calls per minute
};