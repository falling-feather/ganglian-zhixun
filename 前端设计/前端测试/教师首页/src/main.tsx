// This entry remains only as a bookmark bridge after the prototype entered the real app.
const page=location.hash==='#director'?'courses':location.hash==='#materials'?'materials':'classes';
const url=new URL('/teacher/'+page,'http://127.0.0.1:4173');
url.searchParams.set('profileId','teacher-class-a');
url.searchParams.set('sessionId','demo-xunpu-v2');
location.replace(url.href);
