/**
 * YouTube Data API v3 클라이언트
 *
 * 현재 라이브 스트림 제목을 가져오는 기능을 제공합니다.
 */

import { config } from './config.js';

interface YouTubeLiveStream {
  title: string;
  videoId: string;
  channelId: string;
  publishedAt: string;
}

interface YouTubeVideoResponse {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      channelId: string;
      publishedAt: string;
      liveBroadcastContent: string;
    };
  }>;
}

interface YouTubeSearchResponse {
  items?: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      channelId: string;
      publishedAt: string;
      liveBroadcastContent: string;
    };
  }>;
}

/**
 * 특정 비디오 ID로 YouTube 비디오/라이브 정보를 가져옵니다.
 */
async function getVideoById(videoId: string, apiKey: string): Promise<YouTubeLiveStream | null> {
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('id', videoId);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      console.error('[YouTube] API error:', response.status, error);
      return null;
    }

    const data: YouTubeVideoResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('[YouTube] Video not found');
      return null;
    }

    const video = data.items[0];
    return {
      title: video.snippet.title,
      videoId: video.id,
      channelId: video.snippet.channelId,
      publishedAt: video.snippet.publishedAt,
    };
  } catch (error) {
    console.error('[YouTube] Failed to fetch video:', error);
    return null;
  }
}

/**
 * 채널의 현재 라이브 스트림을 검색합니다.
 */
async function searchLiveStream(channelId: string, apiKey: string): Promise<YouTubeLiveStream | null> {
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('channelId', channelId);
    url.searchParams.set('eventType', 'live');
    url.searchParams.set('type', 'video');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      console.error('[YouTube] API error:', response.status, error);
      return null;
    }

    const data: YouTubeSearchResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('[YouTube] No live stream found');
      return null;
    }

    const liveStream = data.items[0];
    return {
      title: liveStream.snippet.title,
      videoId: liveStream.id.videoId,
      channelId: liveStream.snippet.channelId,
      publishedAt: liveStream.snippet.publishedAt,
    };
  } catch (error) {
    console.error('[YouTube] Failed to search live stream:', error);
    return null;
  }
}

/**
 * YouTube 라이브 스트림 정보를 가져옵니다.
 *
 * 우선순위:
 * 1. YOUTUBE_VIDEO_ID가 설정된 경우 해당 비디오 정보 조회
 * 2. YOUTUBE_CHANNEL_ID가 설정된 경우 채널의 라이브 스트림 검색
 *
 * @returns 라이브 스트림 정보 또는 null
 */
export async function getCurrentLiveStream(): Promise<YouTubeLiveStream | null> {
  const apiKey = config.YOUTUBE_API_KEY;
  const videoId = config.YOUTUBE_VIDEO_ID;
  const channelId = config.YOUTUBE_CHANNEL_ID;

  if (!apiKey) {
    console.log('[YouTube] API key not configured');
    return null;
  }

  // 1. 비디오 ID가 있으면 직접 조회
  if (videoId) {
    console.log(`[YouTube] Fetching video by ID: ${videoId}`);
    const result = await getVideoById(videoId, apiKey);
    if (result) {
      console.log(`[YouTube] Found video: ${result.title}`);
      return result;
    }
  }

  // 2. 채널 ID가 있으면 라이브 검색
  if (channelId) {
    console.log(`[YouTube] Searching live stream for channel: ${channelId}`);
    const result = await searchLiveStream(channelId, apiKey);
    if (result) {
      console.log(`[YouTube] Found live stream: ${result.title}`);
      return result;
    }
  }

  console.log('[YouTube] No video ID or channel ID configured');
  return null;
}

/**
 * YouTube 라이브 스트림 제목만 가져옵니다.
 *
 * @returns 라이브 스트림 제목 또는 null
 */
export async function getLiveStreamTitle(): Promise<string | null> {
  const liveStream = await getCurrentLiveStream();
  return liveStream?.title || null;
}
