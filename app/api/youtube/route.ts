import { NextRequest, NextResponse } from 'next/server';
import {
  searchVideos,
  getTrendingMusic,
  getNewReleases,
  getMoodVideos,
  getRelatedVideos,
  getVideoDetails,
  searchMusic
} from '@/app/lib/utils/youtube-api';

// Server-side cache to reduce API calls (lasts longer than client cache)
const SERVER_CACHE: Record<string, { data: any; timestamp: number }> = {};
const SERVER_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for trending, 24 hours for other content

// Helper function to handle API errors consistently
function handleError(error: any) {
  console.error('YouTube API error:', error);
  
  const message = error instanceof Error 
    ? error.message 
    : 'Unknown error occurred';
    
  return NextResponse.json(
    { 
      error: true, 
      message,
      timestamp: new Date().toISOString() 
    },
    { status: 500 }
  );
}

// Helper function to return successful responses
function success(data: any) {
  return NextResponse.json({
    error: false,
    data,
    timestamp: new Date().toISOString()
  });
}

// Helper function to check server cache
function checkCache(cacheKey: string, duration: number = SERVER_CACHE_DURATION) {
  const now = Date.now();
  if (SERVER_CACHE[cacheKey] && now - SERVER_CACHE[cacheKey].timestamp < duration) {
    console.log(`[SERVER] Cache hit for ${cacheKey}`);
    return SERVER_CACHE[cacheKey].data;
  }
  return null;
}

// Helper function to update server cache
function updateCache(cacheKey: string, data: any) {
  SERVER_CACHE[cacheKey] = {
    data,
    timestamp: Date.now()
  };
  console.log(`[SERVER] Cache updated for ${cacheKey}`);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  
  if (!action) {
    return NextResponse.json(
      { error: true, message: 'Missing action parameter' },
      { status: 400 }
    );
  }
  
  // Create a cache key from the request (without timestamp to ensure cache hits)
  const cacheParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== 'timestamp') {
      cacheParams.append(key, value);
    }
  });
  const cacheKey = cacheParams.toString();
  
  try {
    // Use different cache durations based on content type
    let cacheDuration = SERVER_CACHE_DURATION;
    if (action === 'trending' || action === 'new-releases') {
      cacheDuration = 60 * 60 * 1000; // 1 hour for trending content
    } else {
      cacheDuration = 24 * 60 * 60 * 1000; // 24 hours for other content
    }
    
    // Check server cache first
    const cachedData = checkCache(cacheKey, cacheDuration);
    if (cachedData) {
      return success(cachedData);
    }
    
    let data;
    switch (action) {
      case 'trending': {
        const maxResults = parseInt(searchParams.get('maxResults') || '12');
        data = await getTrendingMusic(maxResults);
        break;
      }
      
      case 'new-releases': {
        const maxResults = parseInt(searchParams.get('maxResults') || '12');
        data = await getNewReleases(maxResults);
        break;
      }
      
      case 'search': {
        const query = searchParams.get('query');
        if (!query) {
          return NextResponse.json(
            { error: true, message: 'Missing query parameter' },
            { status: 400 }
          );
        }
        const maxResults = parseInt(searchParams.get('maxResults') || '12');
        data = await searchVideos(query, maxResults);
        break;
      }
      
      case 'search-music': {
        const query = searchParams.get('query');
        if (!query) {
          return NextResponse.json(
            { error: true, message: 'Missing query parameter' },
            { status: 400 }
          );
        }
        const maxResults = parseInt(searchParams.get('maxResults') || '12');
        data = await searchMusic(query, maxResults);
        break;
      }
      
      case 'related': {
        const videoId = searchParams.get('videoId');
        if (!videoId) {
          return NextResponse.json(
            { error: true, message: 'Missing videoId parameter' },
            { status: 400 }
          );
        }
        const maxResults = parseInt(searchParams.get('maxResults') || '12');
        data = await getRelatedVideos(videoId, maxResults);
        break;
      }
      
      case 'mood': {
        const mood = searchParams.get('mood');
        if (!mood) {
          return NextResponse.json(
            { error: true, message: 'Missing mood parameter' },
            { status: 400 }
          );
        }
        const maxResults = parseInt(searchParams.get('maxResults') || '12');
        data = await getMoodVideos(mood, maxResults);
        break;
      }
      
      case 'video-details': {
        const videoId = searchParams.get('videoId');
        if (!videoId) {
          return NextResponse.json(
            { error: true, message: 'Missing videoId parameter' },
            { status: 400 }
          );
        }
        data = await getVideoDetails(videoId);
        if (!data) {
          return NextResponse.json(
            { error: true, message: 'Video not found' },
            { status: 404 }
          );
        }
        break;
      }
      
      default:
        return NextResponse.json(
          { error: true, message: `Invalid action: ${action}` },
          { status: 400 }
        );
    }
    
    // Update the server cache with the new data
    updateCache(cacheKey, data);
    
    return success(data);
  } catch (error) {
    return handleError(error);
  }
} 