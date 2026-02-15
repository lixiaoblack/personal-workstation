/**
 * ColorConvert 颜色转换页面
 */
import React, { useState, useEffect } from "react";
import { App } from "antd";

const ColorConvert: React.FC = () => {
  const { message } = App.useApp();
  const [hex, setHex] = useState("#3c83f6");
  const [rgb, setRgb] = useState("rgb(60, 131, 246)");
  const [hsl, setHsl] = useState("hsl(217, 91%, 60%)");
  const [previewColor, setPreviewColor] = useState("#3c83f6");

  // HEX转RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  // RGB转HSL
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  };

  // 更新颜色
  useEffect(() => {
    const rgbValue = hexToRgb(hex);
    if (rgbValue) {
      setRgb(`rgb(${rgbValue.r}, ${rgbValue.g}, ${rgbValue.b})`);
      const hslValue = rgbToHsl(rgbValue.r, rgbValue.g, rgbValue.b);
      setHsl(`hsl(${hslValue.h}, ${hslValue.s}%, ${hslValue.l}%)`);
      setPreviewColor(hex);
    }
  }, [hex]);

  // 复制到剪贴板
  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    message.success("已复制到剪贴板");
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-hidden p-6">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* 颜色预览 */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <div className="flex items-center gap-6">
            <div
              className="w-32 h-32 rounded-xl shadow-lg"
              style={{ backgroundColor: previewColor }}
            />
            <div className="flex-1 space-y-4">
              <div className="text-lg font-bold text-text-primary">颜色预览</div>
              <div className="text-sm text-text-secondary">
                点击下方颜色值可复制
              </div>
            </div>
          </div>
        </div>

        {/* 颜色选择器 */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <label className="block text-sm font-medium text-text-secondary mb-3">
            选择颜色
          </label>
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="w-full h-16 rounded-lg cursor-pointer border border-border"
          />
        </div>

        {/* 颜色值列表 */}
        <div className="bg-bg-secondary rounded-xl border border-border divide-y divide-border">
          {/* HEX */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-bg-tertiary transition-colors"
            onClick={() => handleCopy(hex)}
          >
            <div>
              <div className="text-xs text-text-tertiary uppercase tracking-widest">HEX</div>
              <div className="text-lg font-mono text-text-primary">{hex}</div>
            </div>
            <span className="material-symbols-outlined text-text-tertiary">content_copy</span>
          </div>

          {/* RGB */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-bg-tertiary transition-colors"
            onClick={() => handleCopy(rgb)}
          >
            <div>
              <div className="text-xs text-text-tertiary uppercase tracking-widest">RGB</div>
              <div className="text-lg font-mono text-text-primary">{rgb}</div>
            </div>
            <span className="material-symbols-outlined text-text-tertiary">content_copy</span>
          </div>

          {/* HSL */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-bg-tertiary transition-colors"
            onClick={() => handleCopy(hsl)}
          >
            <div>
              <div className="text-xs text-text-tertiary uppercase tracking-widest">HSL</div>
              <div className="text-lg font-mono text-text-primary">{hsl}</div>
            </div>
            <span className="material-symbols-outlined text-text-tertiary">content_copy</span>
          </div>
        </div>

        {/* 常用颜色 */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <div className="text-sm font-medium text-text-secondary mb-4">常用颜色</div>
          <div className="grid grid-cols-8 gap-2">
            {[
              "#EF4444", "#F97316", "#F59E0B", "#22C55E", "#10B981", "#14B8A6",
              "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
              "#D946EF", "#EC4899", "#F43F5E", "#78716C", "#000000", "#FFFFFF",
            ].map((color) => (
              <button
                key={color}
                onClick={() => setHex(color)}
                className="w-8 h-8 rounded-lg border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export { ColorConvert };
export default ColorConvert;
