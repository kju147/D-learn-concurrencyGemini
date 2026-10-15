import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../lib/site';

export async function GET(context: APIContext) {
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site ?? 'https://concurrency-academy.pages.dev',
    items: [
      {
        title: 'P0 地基动工：平台版信息架构上线',
        link: '/changelog',
        pubDate: new Date('2026-09-25'),
        description: '迁移至 Astro，课程 URL 化，内容 schema 与验收门禁建立。',
      },
    ],
  });
}
