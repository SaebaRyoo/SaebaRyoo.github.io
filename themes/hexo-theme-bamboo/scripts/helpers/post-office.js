'use strict';

const { createReadStream } = require('fs');
const { createHash } = require('crypto');
const { dirname, join } = require('path');
const { stripHTML, unescapeHTML } = require('hexo-util');

const stamps = {
  '前端': 'terminal', '工具': 'terminal', 'AI': 'terminal',
  '后端': 'server', '运维': 'letters', '数据库': 'server',
  '网络': 'network', 'Web3.0': 'network'
};

hexo.extend.helper.register('postal_stamp', category => stamps[category] || 'letters');

const coverImages = [
  'anime-06-night-coding', 'anime-02-coastal-train', 'anime-03-rainy-cafe',
  'anime-04-sakura-picnic', 'anime-05-snowy-postcards', 'anime-01-seaside-post',
  '01-pair-programming', '02-rainy-delivery', '03-coffee-break',
  '04-starlit-reading', '05-autumn-mail-route',
  'soft-01-sorting-letters', 'soft-02-forest-delivery', 'soft-03-debugging-break'
];

hexo.extend.helper.register('postal_cover', post => {
  const hash = createHash('sha1').update(post.slug || post.title || '').digest();
  const image = coverImages[hash.readUInt32BE(0) % coverImages.length] + '.jpg';
  return {
    src: 'images/gugu-doro/web/' + image,
    thumbnail: 'images/gugu-doro/web/thumbs/' + image
  };
});

function plainText(html) {
  return unescapeHTML(stripHTML(html)).replace(/\s+/g, ' ').trim();
}

hexo.extend.helper.register('postal_article_html', html => html.replace(/<img\b[^>]*>/gi, image => {
  // Older Hexo caches can still contain Bamboo's placeholder srcset.
  if (/\bdata-srcset=/.test(image) && /\blazyload\b/.test(image)) {
    image = image.replace(/\s+srcset="[^"]*"/i, '').replace(/\s+data-srcset=/i, ' srcset=');
  }
  return /\sloading=/i.test(image) ? image : image.replace(/^<img\b/i, '<img loading="lazy"');
}));

hexo.extend.helper.register('postal_excerpt', post => {
  if (post.description || post.excerpt) return plainText(post.description || post.excerpt).slice(0, 140);
  const html = post.content || '';
  for (const [, paragraph] of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = plainText(paragraph);
    if (text.length >= 20 && !/^https?:\/\//i.test(text) && !/^<(code|img)\b/i.test(paragraph)) {
      return text.slice(0, 140);
    }
  }
  return Array.from(html.matchAll(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/gi), match => plainText(match[1]))
    .filter(heading => heading && heading !== post.title)
    .slice(0, 3).join(' · ').slice(0, 140);
});

// Serve the installed renderer with the site so existing diagrams work offline.
hexo.extend.generator.register('postal-mermaid', function () {
  if (!this.theme.config.mermaid.on) return [];
  const bundle = join(dirname(require.resolve('mermaid')), 'mermaid.min.js');
  return { path: 'post-office/mermaid.min.js', data: () => createReadStream(bundle) };
});
