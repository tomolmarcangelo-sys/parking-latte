import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// Replace standard sections
content = content.replace(/bg-white\/70 dark:bg-slate-900\/50 p-10 rounded-\[32px\]/g, 'bg-white/70 dark:bg-slate-900/50 p-6 rounded-[32px]');
content = content.replace(/bg-white\/70 dark:bg-slate-900\/50 backdrop-blur-md rounded-\[24px\] border border-slate-200 dark:border-slate-800 p-8/g, 'bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-[24px] border border-slate-200 dark:border-slate-800 p-6');
content = content.replace(/bg-white\/70 dark:bg-slate-900\/50 backdrop-blur-md p-8 rounded-\[32px\]/g, 'bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-[32px]');
content = content.replace(/bg-white\/70 dark:bg-slate-900\/50 backdrop-blur-md rounded-\[28px\] border p-8/g, 'bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-[28px] border p-6');
content = content.replace(/bg-white\/70 dark:bg-slate-900\/50 backdrop-blur-md p-6 rounded-\[32px\]/g, 'bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-[32px]');
content = content.replace(/bg-white\/70 dark:bg-slate-900\/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-\[32px\] p-8/g, 'bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-[32px] p-6');
content = content.replace(/bg-white\/70 dark:bg-slate-900\/50 backdrop-blur-md rounded-\[40px\] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-8/g, 'bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6');
content = content.replace(/bg-white\/70 dark:bg-slate-900\/50 backdrop-blur-md rounded-\[24px\] border p-8/g, 'bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-[24px] border p-6');
content = content.replace(/bg-white\/70 dark:bg-slate-900\/50 backdrop-blur-md p-10 rounded-\[40px\]/g, 'bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-[40px]');


fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
