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
 * YouTube 채널의 현재 라이브 스트림 정보를 가져옵니다.
 *
 * @returns 라이브 스트림 정보 또는 null (라이브가 없는 경우)
 */
export async function getCurrentLiveStream(): Promise<YouTubeLiveStream | null> {
  const apiKey = config.YOUTUBE_API_KEY;
  const channelId = config.YOUTUBE_CHANNEL_ID;

  if (!apiKey || !channelId) {
    console.log('[YouTube] API key or channel ID not configured');
    return null;
  }

  try {
    // YouTube Data API v3 - search endpoint로 현재 라이브 스트림 검색
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
    const result: YouTubeLiveStream = {
      title: liveStream.snippet.title,
      videoId: liveStream.id.videoId,
      channelId: liveStream.snippet.channelId,
      publishedAt: liveStream.snippet.publishedAt,
    };

    console.log(`[YouTube] Found live stream: ${result.title}`);
    return result;
  } catch (error) {
    console.error('[YouTube] Failed to fetch live stream:', error);
    return null;
  }
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
