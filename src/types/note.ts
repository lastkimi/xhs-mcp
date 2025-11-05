// 笔记详情和笔记统计数据接口



export interface NoteDetail {
  // 基础信息
  noteId: string;
  title: string;
  url: string;
  content?: string;
  author?: string;
  publishTime: string;
  coverImage?: string;
  images?: string[];
  location?: string;
  tags?: string[];
  views: string;
  likes: string;
  comments: string;
  favorites: string;
  shares: string;
  exposure?: string;
  coverClickRate?: string;
  fansIncrease?: string;
  avgViewTime?: string;
  danmaku?: string;
  detailUrl?: string;
}






export function serializeNoteDetail(noteDetail: NoteDetail): string {
  const parts: string[] = [];
  if (noteDetail.title) {
    parts.push(`标题: ${noteDetail.title}`);
  }
  if (noteDetail.content) {
    parts.push(`内容: ${noteDetail.content}`);
  }
  if (noteDetail.publishTime) {
    parts.push(`发布时间: ${noteDetail.publishTime}`);
  }
  if (noteDetail.author) {
    parts.push(`作者: ${noteDetail.author}`);
  }
  if (noteDetail.location) {
    parts.push(`位置: ${noteDetail.location}`);
  }
  if (noteDetail.tags && noteDetail.tags.length > 0) {
    parts.push(`标签: ${noteDetail.tags.map(tag => `#${tag}`).join(' ')}`);
  }
  const stats: string[] = [];
  if (noteDetail.views && noteDetail.views !== '0') stats.push(`观看 ${noteDetail.views}`);
  if (noteDetail.likes && noteDetail.likes !== '0') stats.push(`点赞 ${noteDetail.likes}`);
  if (noteDetail.comments && noteDetail.comments !== '0') stats.push(`评论 ${noteDetail.comments}`);
  if (noteDetail.favorites && noteDetail.favorites !== '0') stats.push(`收藏 ${noteDetail.favorites}`);
  if (noteDetail.shares && noteDetail.shares !== '0') stats.push(`分享 ${noteDetail.shares}`);
  if (stats.length > 0) {
    parts.push(`互动: ${stats.join(', ')}`);
  }
  const advancedStats: string[] = [];
  if (noteDetail.exposure) advancedStats.push(`曝光 ${noteDetail.exposure}`);
  if (noteDetail.coverClickRate) advancedStats.push(`封面点击率 ${noteDetail.coverClickRate}`);
  if (noteDetail.fansIncrease) advancedStats.push(`涨粉 ${noteDetail.fansIncrease}`);
  if (noteDetail.avgViewTime) advancedStats.push(`人均观看时长 ${noteDetail.avgViewTime}`);
  if (noteDetail.danmaku) advancedStats.push(`弹幕 ${noteDetail.danmaku}`);
  if (advancedStats.length > 0) {
    parts.push(`数据: ${advancedStats.join(', ')}`);
  }
  if (noteDetail.images && noteDetail.images.length > 0) {
    parts.push(`图片: ${noteDetail.images.length}张`);
  }
  if (noteDetail.url) {
    parts.push(`链接: ${noteDetail.url}`);
  }
  return parts.join('\n');
}