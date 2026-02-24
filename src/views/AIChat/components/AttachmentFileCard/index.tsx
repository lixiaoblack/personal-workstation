/**
 * AttachmentFileCard - 附件文件卡片组件
 * 使用 Ant Design X FileCard 组件展示文件/图片/URL 信息
 * 
 * 功能：
 * - 显示文件名、大小、类型
 * - 支持图片预览
 * - 支持点击预览文件
 */
import React, { memo, useMemo, useCallback } from "react";
import { FileCard } from "@ant-design/x";
import { LinkOutlined } from "@ant-design/icons";
import type { AttachmentInfo } from "@/types/electron";

interface AttachmentFileCardProps {
  /** 附件信息 */
  attachment: AttachmentInfo;
  /** 尺寸 */
  size?: 'small' | 'default';
  /** 是否加载中 */
  loading?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 额外描述信息 */
  extraDescription?: string;
  /** 是否已添加到知识库 */
  addedToKnowledge?: boolean;
  /** 知识库名称 */
  knowledgeName?: string;
}

// 文件类型到预设图标的映射
const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  xls: 'excel',
  xlsx: 'excel',
  ppt: 'ppt',
  pptx: 'ppt',
  md: 'markdown',
  markdown: 'markdown',
  zip: 'zip',
  rar: 'zip',
  '7z': 'zip',
  js: 'javascript',
  ts: 'javascript',
  jsx: 'javascript',
  tsx: 'javascript',
  py: 'python',
  java: 'java',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  mp4: 'video',
  mov: 'video',
  avi: 'video',
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
};

const AttachmentFileCard: React.FC<AttachmentFileCardProps> = memo(
  ({
    attachment,
    size = 'default',
    loading = false,
    onClick,
    extraDescription,
    addedToKnowledge = false,
    knowledgeName,
  }) => {
    // 获取文件扩展名
    const fileExtension = useMemo(() => {
      if (attachment.type === 'url') return 'link';
      const name = attachment.name.toLowerCase();
      const ext = name.split('.').pop() || '';
      return ext;
    }, [attachment.name, attachment.type]);

    // 获取预设图标
    const presetIcon = useMemo(() => {
      if (attachment.type === 'url') return undefined;
      return FILE_TYPE_ICONS[fileExtension] || 'default';
    }, [fileExtension, attachment.type]);

    // 格式化文件大小
    const formatSize = useCallback((bytes?: number) => {
      if (!bytes) return undefined;
      return bytes;
    }, []);

    // 构建描述
    const description = useMemo(() => {
      const parts: string[] = [];
      
      if (attachment.type === 'url') {
        parts.push('网页链接');
      }
      
      if (extraDescription) {
        parts.push(extraDescription);
      }
      
      if (addedToKnowledge && knowledgeName) {
        parts.push(`已添加到「${knowledgeName}」`);
      }
      
      return parts.length > 0 ? parts.join(' · ') : undefined;
    }, [attachment.type, extraDescription, addedToKnowledge, knowledgeName]);

    // 确定卡片类型
    const cardType = useMemo(() => {
      if (attachment.type === 'image') return 'image';
      if (attachment.type === 'url') return 'file';
      
      // 根据文件扩展名判断
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      if (imageExts.includes(fileExtension)) return 'image';
      
      return 'file';
    }, [attachment.type, fileExtension]);

    // 处理 URL 类型
    if (attachment.type === 'url') {
      return (
        <FileCard
          name={attachment.name}
          description={description}
          size={size}
          loading={loading}
          onClick={onClick}
          type="file"
          icon={<LinkOutlined />}
          className={addedToKnowledge ? 'border-success/50' : ''}
        />
      );
    }

    // 图片类型
    if (cardType === 'image' && attachment.thumbnail) {
      return (
        <FileCard
          name={attachment.name}
          byte={formatSize(attachment.size)}
          description={description}
          size={size}
          loading={loading}
          onClick={onClick}
          type="image"
          src={attachment.thumbnail}
          icon={presetIcon as 'image'}
          className={addedToKnowledge ? 'border-success/50' : ''}
        />
      );
    }

    // 普通文件类型
    return (
      <FileCard
        name={attachment.name}
        byte={formatSize(attachment.size)}
        description={description}
        size={size}
        loading={loading}
        onClick={onClick}
        type="file"
        icon={presetIcon as 'pdf' | 'word' | 'excel' | 'ppt' | 'markdown' | 'image' | 'zip' | 'video' | 'audio' | 'java' | 'javascript' | 'python' | 'default'}
        className={addedToKnowledge ? 'border-success/50' : ''}
      />
    );
  }
);

AttachmentFileCard.displayName = "AttachmentFileCard";

export default AttachmentFileCard;
