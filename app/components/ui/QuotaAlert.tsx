'use client';

import { AlertTriangle, RefreshCw, RotateCw, Trash2, Loader2, ActivityIcon } from 'lucide-react';
import { resetAllKeyStatuses, checkQuotaStatus, forceKeyRotation, clearQuotaStatus, testAllApiKeys, forceResetAllKeys, setCurrentApiKeyIndex } from '@/app/lib/utils/youtube-api';
import { useState } from 'react';

interface QuotaAlertProps {
  onRefreshAfterKeyChange?: () => void;
}

/**
 * Component that displays a warning when YouTube API quota is exceeded
 */
export default function QuotaAlert({ onRefreshAfterKeyChange }: QuotaAlertProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [rotateSuccess, setRotateSuccess] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<string | null>(null);
  const [isForceResetting, setIsForceResetting] = useState(false);
  const [forceResetSuccess, setForceResetSuccess] = useState(false);
  const [isSettingKey1, setIsSettingKey1] = useState(false);
  const [isSettingKey2, setIsSettingKey2] = useState(false);
  const [isSettingKey3, setIsSettingKey3] = useState(false);
  const [isSettingKey4, setIsSettingKey4] = useState(false);
  const [keySetSuccess, setKeySetSuccess] = useState<number | null>(null);
  
  const handleReset = () => {
    setIsResetting(true);
    
    try {
      // Reset all key statuses
      resetAllKeyStatuses();
      
      // Show success message temporarily
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
      }, 3000);
      
      // Call the refresh callback if provided
      if (onRefreshAfterKeyChange) {
        setTimeout(() => {
          onRefreshAfterKeyChange();
        }, 500); // Small delay to allow the UI to update first
      }
    } catch (error) {
      console.error('Error resetting key statuses:', error);
    } finally {
      setIsResetting(false);
    }
  };
  
  const handleRotate = () => {
    setIsRotating(true);
    
    try {
      console.log('🔄🔄🔄 MANUALLY ROTATING API KEY FROM UI 🔄🔄🔄');
      
      // Force rotation to the next key
      forceKeyRotation();
      
      // Show success message temporarily
      setRotateSuccess(true);
      setTimeout(() => {
        setRotateSuccess(false);
      }, 3000);
      
      // Call the refresh callback if provided
      if (onRefreshAfterKeyChange) {
        console.log('🔄 Triggering content refresh after key rotation');
        setTimeout(() => {
          onRefreshAfterKeyChange();
        }, 1000); // Increased delay to allow the key rotation to complete
      }
      
      console.log('🔄🔄🔄 MANUAL KEY ROTATION COMPLETE 🔄🔄🔄');
    } catch (error) {
      console.error('Error rotating API key:', error);
    } finally {
      setIsRotating(false);
    }
  };
  
  const handleClearQuota = () => {
    setIsClearing(true);
    
    try {
      // Clear quota status from localStorage
      clearQuotaStatus();
      
      // Show success message temporarily
      setClearSuccess(true);
      setTimeout(() => {
        setClearSuccess(false);
      }, 3000);
      
      // Call the refresh callback if provided
      if (onRefreshAfterKeyChange) {
        setTimeout(() => {
          onRefreshAfterKeyChange();
        }, 500); // Small delay to allow the UI to update first
      }
    } catch (error) {
      console.error('Error clearing quota status:', error);
    } finally {
      setIsClearing(false);
    }
  };
  
  const handleTestKeys = async () => {
    setIsTesting(true);
    setTestResults(null);
    
    try {
      // Capture console logs to display in the UI
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      let logs: string[] = [];
      
      // Override console.log and console.error to capture logs
      console.log = (...args) => {
        originalConsoleLog(...args);
        logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '));
      };
      
      console.error = (...args) => {
        originalConsoleError(...args);
        logs.push('ERROR: ' + args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '));
      };
      
      // Test all API keys
      await testAllApiKeys();
      
      // Restore original console functions
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      
      // Format and display the results
      setTestResults(logs.join('\n'));
      
      // If onRefreshAfterKeyChange is provided, call it to refresh the UI
      if (onRefreshAfterKeyChange) {
        setTimeout(() => {
          onRefreshAfterKeyChange();
        }, 1000);
      }
    } catch (error) {
      console.error('Error testing API keys:', error);
      setTestResults(`Error testing API keys: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };
  
  const handleForceReset = () => {
    setIsForceResetting(true);
    
    try {
      // Force reset all keys
      forceResetAllKeys();
      
      // Show success message temporarily
      setForceResetSuccess(true);
      setTimeout(() => {
        setForceResetSuccess(false);
      }, 3000);
      
      // Call the refresh callback if provided
      if (onRefreshAfterKeyChange) {
        setTimeout(() => {
          onRefreshAfterKeyChange();
        }, 500); // Small delay to allow the UI to update first
      }
    } catch (error) {
      console.error('Error force resetting keys:', error);
    } finally {
      setIsForceResetting(false);
    }
  };
  
  const handleSetKey = (keyIndex: number) => {
    // Add direct console logs to verify function is being called
    console.log(`🔍🔍🔍 BUTTON CLICKED: Attempting to set to Key #${keyIndex + 1}`);
    console.log(`🔍 Attempting to set key index to: ${keyIndex}`);
    
    // Set the appropriate loading state
    if (keyIndex === 0) setIsSettingKey1(true);
    else if (keyIndex === 1) setIsSettingKey2(true);
    else if (keyIndex === 2) setIsSettingKey3(true);
    else if (keyIndex === 3) {
      console.log('🔍 Setting loading state for Key #4');
      setIsSettingKey4(true);
    }
    
    try {
      console.log(`🔄🔄🔄 MANUALLY SETTING TO KEY #${keyIndex + 1} FROM UI 🔄🔄🔄`);
      
      // Set the current API key index
      console.log(`🔍 About to call setCurrentApiKeyIndex(${keyIndex})`);
      setCurrentApiKeyIndex(keyIndex);
      console.log(`🔍 Called setCurrentApiKeyIndex(${keyIndex})`);
      
      // Show success message temporarily
      setKeySetSuccess(keyIndex);
      setTimeout(() => {
        setKeySetSuccess(null);
      }, 3000);
      
      // Call the refresh callback if provided
      if (onRefreshAfterKeyChange) {
        console.log(`🔄 Triggering content refresh after setting to key #${keyIndex + 1}`);
        setTimeout(() => {
          onRefreshAfterKeyChange();
        }, 1000);
      }
      
      console.log(`🔄🔄🔄 MANUAL KEY SETTING COMPLETE 🔄🔄🔄`);
    } catch (error) {
      console.error(`Error setting API key to #${keyIndex + 1}:`, error);
    } finally {
      // Reset the appropriate loading state
      if (keyIndex === 0) setIsSettingKey1(false);
      else if (keyIndex === 1) setIsSettingKey2(false);
      else if (keyIndex === 2) setIsSettingKey3(false);
      else if (keyIndex === 3) {
        console.log('🔍 Resetting loading state for Key #4');
        setIsSettingKey4(false);
      }
    }
  };
  
  return (
    <div className="bg-amber-800 text-white p-3 rounded-md mb-4 shadow-md">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1">
          <h3 className="font-semibold text-sm">YouTube API quota exceeded</h3>
          <p className="text-sm mt-1">
            We've reached the daily limit for YouTube API requests. The app is now showing curated fallback content until our quota resets.
          </p>
          <p className="text-sm mt-1">
            You can still browse and play the displayed songs. We'll automatically resume API calls tomorrow when the quota refreshes.
          </p>
          
          {resetSuccess && (
            <p className="text-green-300 text-sm mt-2 font-medium">
              Key statuses reset successfully! The app will try using all available keys again.
            </p>
          )}
          
          {rotateSuccess && (
            <p className="text-green-300 text-sm mt-2 font-medium">
              Rotated to the next API key! The app will now try using a different key.
            </p>
          )}
          
          {clearSuccess && (
            <p className="text-green-300 text-sm mt-2 font-medium">
              Quota status cleared successfully! The app will now try using all keys again.
            </p>
          )}
          
          {forceResetSuccess && (
            <p className="text-green-300 text-sm mt-2 font-medium">
              All keys have been force reset! The app will try using all available keys again.
            </p>
          )}
          
          {keySetSuccess !== null && (
            <p className="text-green-300 text-sm mt-2 font-medium">
              Set to Key #{keySetSuccess + 1}! The app will now use this key.
            </p>
          )}
          
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleRotate}
              disabled={isRotating}
              className="bg-white/10 hover:bg-white/20 text-white text-xs py-1 px-3 rounded flex items-center"
            >
              {isRotating ? (
                <>
                  <RotateCw className="h-3 w-3 mr-1 animate-spin" />
                  Rotating...
                </>
              ) : (
                <>
                  <RotateCw className="h-3 w-3 mr-1" />
                  Try Next API Key
                </>
              )}
            </button>
            
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="bg-white/10 hover:bg-white/20 text-white text-xs py-1 px-3 rounded flex items-center"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset All Keys
                </>
              )}
            </button>
            
            <button
              onClick={handleClearQuota}
              disabled={isClearing}
              className="bg-white/10 hover:bg-white/20 text-white text-xs py-1 px-3 rounded flex items-center"
            >
              {isClearing ? (
                <>
                  <Trash2 className="h-3 w-3 mr-1 animate-pulse" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear Quota Status
                </>
              )}
            </button>
            
            <button 
              className="ml-2 flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-md text-sm transition-colors"
              onClick={handleTestKeys}
              disabled={isTesting}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Keys...
                </>
              ) : (
                <>
                  <ActivityIcon className="mr-2 h-4 w-4" />
                  Test API Keys
                </>
              )}
            </button>
            
            <button
              onClick={handleForceReset}
              disabled={isForceResetting}
              className="bg-white/10 hover:bg-white/20 text-white text-xs py-1 px-3 rounded flex items-center"
            >
              {isForceResetting ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Force Resetting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Force Reset Keys
                </>
              )}
            </button>
          </div>
          
          <div className="mt-3">
            <p className="text-xs mb-2 text-white/70">Directly select a specific API key:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSetKey(0)}
                disabled={isSettingKey1}
                className="bg-white/10 hover:bg-white/20 text-white text-xs py-1 px-3 rounded flex items-center"
              >
                {isSettingKey1 ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Setting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Use Key #1
                  </>
                )}
              </button>
              
              <button
                onClick={() => handleSetKey(1)}
                disabled={isSettingKey2}
                className="bg-white/10 hover:bg-white/20 text-white text-xs py-1 px-3 rounded flex items-center"
              >
                {isSettingKey2 ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Setting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Use Key #2
                  </>
                )}
              </button>
              
              <button
                onClick={() => handleSetKey(2)}
                disabled={isSettingKey3}
                className="bg-white/10 hover:bg-white/20 text-white text-xs py-1 px-3 rounded flex items-center"
              >
                {isSettingKey3 ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Setting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Use Key #3
                  </>
                )}
              </button>
              
              <button
                onClick={() => handleSetKey(3)}
                disabled={isSettingKey4}
                className="bg-white/10 hover:bg-white/20 text-white text-xs py-1 px-3 rounded flex items-center"
              >
                {isSettingKey4 ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Setting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Use Key #4
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {testResults && (
        <div className="mt-4 p-4 bg-muted rounded-md overflow-auto max-h-[400px] text-xs font-mono">
          <pre>{testResults}</pre>
        </div>
      )}
    </div>
  );
} 