/**
 * useTypewriter - 打字机效果 Hook
 * 模拟流式打字效果，让文本逐字显示
 */
import { useState, useEffect, useRef, useCallback } from "react";

interface UseTypewriterOptions {
  /** 每个字符的延迟时间（毫秒） */
  charDelay?: number;
  /** 是否启用打字机效果 */
  enabled?: boolean;
  /** 完成回调 */
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  /** 当前显示的文本 */
  displayText: string;
  /** 是否正在打字 */
  isTyping: boolean;
  /** 是否已完成 */
  isComplete: boolean;
  /** 重置打字机 */
  reset: () => void;
  /** 跳过动画，直接显示全部 */
  skip: () => void;
  /** 设置新文本 */
  setText: (text: string) => void;
}

/**
 * 打字机效果 Hook
 *
 * @example
 * const { displayText, isTyping, skip } = useTypewriter(fullContent, {
 *   charDelay: 15,
 *   enabled: true,
 * });
 */
export function useTypewriter(
  text: string,
  options: UseTypewriterOptions = {}
): UseTypewriterReturn {
  const { charDelay = 15, enabled = true, onComplete } = options;

  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const textRef = useRef(text);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  // 更新回调引用
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 更新文本引用
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // 清理定时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 打字效果
  useEffect(() => {
    // 如果禁用或文本为空，直接显示全部
    if (!enabled || !text) {
      setDisplayText(text);
      setIsTyping(false);
      setIsComplete(!!text);
      return;
    }

    const currentLength = displayText.length;
    const newLength = text.length;

    // 如果文本完全相同，不做任何事
    if (text === displayText) {
      setIsTyping(false);
      setIsComplete(true);
      return;
    }

    // 如果新文本以当前显示开头，继续追加
    if (text.startsWith(displayText) && currentLength < newLength) {
      // 关键修复：同步 indexRef 到当前显示的长度
      indexRef.current = currentLength;
      setIsTyping(true);
      setIsComplete(false);
    } else if (newLength < currentLength) {
      // 新文本比当前显示短，说明是重置（不应该在流式中发生）
      setDisplayText("");
      indexRef.current = 0;
      setIsTyping(true);
      setIsComplete(false);
    } else {
      // 新文本不是以当前显示开头，但更长
      // 尝试找到共同前缀
      let commonPrefixLength = 0;
      for (let i = 0; i < Math.min(currentLength, newLength); i++) {
        if (displayText[i] === text[i]) {
          commonPrefixLength++;
        } else {
          break;
        }
      }

      if (commonPrefixLength > 0 && commonPrefixLength === currentLength) {
        // 当前显示是新文本的前缀，继续追加
        indexRef.current = currentLength;
        setIsTyping(true);
        setIsComplete(false);
      } else {
        // 否则重置并重新开始
        setDisplayText("");
        indexRef.current = 0;
        setIsTyping(true);
        setIsComplete(false);
      }
    }

    const typeNextChar = () => {
      // 使用最新的 textRef 和 indexRef
      const currentText = textRef.current;
      const currentIndex = indexRef.current;

      if (currentIndex < currentText.length) {
        // 每次添加多个字符，加速效果
        const charsToAdd = Math.min(3, currentText.length - currentIndex);
        const nextIndex = currentIndex + charsToAdd;
        const newText = currentText.slice(0, nextIndex);

        setDisplayText(newText);
        indexRef.current = nextIndex;

        // 继续打字
        timerRef.current = setTimeout(typeNextChar, charDelay);
      } else {
        // 打字完成
        setIsTyping(false);
        setIsComplete(true);
        onCompleteRef.current?.();
      }
    };

    // 开始打字
    timerRef.current = setTimeout(typeNextChar, charDelay);

    return clearTimer;
    // displayText 不应作为依赖，否则会导致循环渲染
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled, charDelay, clearTimer]);

  // 重置
  const reset = useCallback(() => {
    clearTimer();
    setDisplayText("");
    indexRef.current = 0;
    setIsTyping(false);
    setIsComplete(false);
  }, [clearTimer]);

  // 跳过动画
  const skip = useCallback(() => {
    clearTimer();
    setDisplayText(textRef.current);
    indexRef.current = textRef.current.length;
    setIsTyping(false);
    setIsComplete(true);
    onCompleteRef.current?.();
  }, [clearTimer]);

  // 设置新文本
  const setText = useCallback((newText: string) => {
    textRef.current = newText;
    setIsTyping(true);
    setIsComplete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    displayText,
    isTyping,
    isComplete,
    reset,
    skip,
    setText,
  };
}
