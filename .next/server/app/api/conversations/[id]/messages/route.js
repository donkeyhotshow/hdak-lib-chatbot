(()=>{var a={};a.id=987,a.ids=[987],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},1127:(a,b,c)=>{"use strict";c.d(b,{K:()=>v});var d=c(9608),e=c(3764),f=c(3686),g=c(8510),h=c(9745),i=c(2352),j=c(4266),k=c(4396),l=c(862);let m=process.env.DATABASE_URL||"postgres://db:db@localhost:5432/db";process.env.DATABASE_URL||console.warn("WARNING: DATABASE_URL is not set. Database calls will fail at runtime.");let n=(0,d.lw)(m),o=(0,e.fd)(n),p=(0,f.cJ)("conversations",{id:(0,g.vX)("id").primaryKey(),title:(0,h.Qq)("title").notNull(),createdAt:(0,i.vE)("created_at").default((0,l.ll)`CURRENT_TIMESTAMP`).notNull()}),q=(0,f.cJ)("messages",{id:(0,g.vX)("id").primaryKey(),conversationId:(0,j.nd)("conversation_id").notNull(),role:(0,h.Qq)("role").notNull(),content:(0,h.Qq)("content").notNull(),createdAt:(0,i.vE)("created_at").default((0,l.ll)`CURRENT_TIMESTAMP`).notNull()}),r=(0,f.cJ)("library_info",{id:(0,g.vX)("id").primaryKey(),key:(0,h.Qq)("key").notNull(),value_uk:(0,h.Qq)("value_uk").notNull(),value_en:(0,h.Qq)("value_en").notNull().default(""),category:(0,h.Qq)("category").notNull(),source:(0,h.Qq)("source").notNull().default("admin"),updated_at:(0,i.vE)("updated_at").notNull().defaultNow()}),s=(0,f.cJ)("library_resources",{id:(0,g.vX)("id").primaryKey(),name:(0,h.Qq)("name").notNull(),type:(0,h.Qq)("type").notNull(),url:(0,h.Qq)("url").notNull(),description_uk:(0,h.Qq)("description_uk").notNull(),description_en:(0,h.Qq)("description_en").notNull().default(""),is_official:(0,k.zM)("is_official").notNull().default(!0),requires_auth:(0,k.zM)("requires_auth").notNull().default(!1)});var t=c(8689),u=c(1559);let v={async getConversation(a){let[b]=await o.select().from(p).where((0,t.eq)(p.id,a));return b},getAllConversations:async()=>o.select().from(p).orderBy((0,u.i)(p.createdAt)),async createConversation(a){let[b]=await o.insert(p).values({title:a}).returning();return b},async deleteConversation(a){await o.delete(q).where((0,t.eq)(q.conversationId,a)),await o.delete(p).where((0,t.eq)(p.id,a))},getMessagesByConversation:async a=>o.select().from(q).where((0,t.eq)(q.conversationId,a)).orderBy(q.createdAt),async createMessage(a,b,c){let[d]=await o.insert(q).values({conversationId:a,role:b,content:c}).returning();return d},getLibraryInfo:async()=>o.select().from(r),getLibraryResources:async()=>o.select().from(s),async seedLibraryData(){0===(await o.select().from(r)).length&&await o.insert(r).values([{key:"address",value_uk:"вул. Бурсацький узвіз, 4, Харків, 61057, Україна",value_en:"4 Bursatsky Descent, Kharkiv, 61057, Ukraine",category:"contacts",source:"library"},{key:"phone",value_uk:"+38 (057) 707-53-35",value_en:"+38 (057) 707-53-35",category:"contacts",source:"library"},{key:"email",value_uk:"library@hdak.edu.ua",value_en:"library@hdak.edu.ua",category:"contacts",source:"library"},{key:"hours",value_uk:"Понеділок – П'ятниця: 9:00–17:00. Субота та неділя — вихідні.",value_en:"Monday – Friday: 9:00–17:00. Saturday and Sunday are days off.",category:"hours",source:"library"},{key:"rules",value_uk:"Користування бібліотекою безкоштовне для студентів, аспірантів та викладачів ХДАК. Для запису потрібен студентський квиток або посвідчення співробітника. Книги видаються на термін, встановлений бібліотекарем.",value_en:"Library services are free for HDAK students, postgraduates, and staff. A student ID or staff card is required for registration.",category:"rules",source:"library"},{key:"services",value_uk:"Послуги: видача книг додому, читальний зал, доступ до електронного каталогу, інституційного репозитарію, консультації бібліотекаря. Міжбібліотечний абонемент — лише за попередньою домовленістю.",value_en:"Services: home lending, reading room, access to electronic catalog, institutional repository, librarian consultations. Interlibrary loan by prior arrangement only.",category:"services",source:"library"},{key:"about",value_uk:"Наукова бібліотека Харківської державної академії культури (ХДАК) — структурний підрозділ академії. Забезпечує доступ до наукової, навчальної та методичної літератури для студентів і викладачів.",value_en:"The Scientific Library of Kharkiv State Academy of Culture (HDAK) is a structural unit of the academy providing access to academic, educational and methodological literature.",category:"general",source:"library"}]),0===(await o.select().from(s)).length&&await o.insert(s).values([{name:"Офіційний сайт бібліотеки",type:"site",url:"https://lib-hdak.in.ua/",description_uk:"Головна сторінка бібліотеки ХДАК. Новини, анонси заходів, загальна інформація.",description_en:"HDAK Library main website. News, events, general information.",is_official:!0,requires_auth:!1},{name:"Електронний каталог",type:"catalog",url:"https://library-service.com.ua:8443/khkhdak/DocumentSearchForm",description_uk:"Пошук книг, журналів та інших документів у фонді бібліотеки ХДАК. Для пошуку введіть автора, назву або ключові слова.",description_en:"Search books, journals and other documents in the HDAK library collection.",is_official:!0,requires_auth:!1},{name:"Інституційний репозитарій",type:"repository",url:"http://repo.hdak.edu.ua/",description_uk:"Відкритий архів наукових праць, дисертацій, монографій та статей викладачів і студентів ХДАК. Доступний без реєстрації.",description_en:"Open archive of scientific papers, dissertations, monographs by HDAK faculty and students. No registration required.",is_official:!0,requires_auth:!1}])}}},3033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},4870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},6487:()=>{},7562:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>E,patchFetch:()=>D,routeModule:()=>z,serverHooks:()=>C,workAsyncStorage:()=>A,workUnitAsyncStorage:()=>B});var d={};c.r(d),c.d(d,{GET:()=>x,POST:()=>y,dynamic:()=>v});var e=c(5736),f=c(9117),g=c(4044),h=c(9326),i=c(2324),j=c(261),k=c(4290),l=c(5328),m=c(8928),n=c(6595),o=c(3421),p=c(7679),q=c(1681),r=c(3446),s=c(6439),t=c(1356),u=c(1127);let v="force-dynamic",w=[{triggers:["каталог","знайти книгу","пошук","є у вас","автор"],content:`Електронний каталог бібліотеки ХДАК:

🔍 Пошук: https://library-service.com.ua:8443/khkhdak/DocumentSearchForm
📄 Сторінка: https://lib-hdak.in.ua/e-catalog.html

Пошук за: автором, назвою, темою, роком видання, анотацією.
При пошуку за назвою — шукайте за окремими словами, не лише початком.

📱 Мобільний додаток Android:
https://play.google.com/store/apps/details?id=ush.libclient
Адреса для налаштування: https://ush.com.ua/khkhdak`,chips:["Пошук за автором","Репозитарій","Мобільний додаток"]},{triggers:["записатися","стати читачем","читацький квиток","реєстрація"],content:`Запис до бібліотеки ХДАК:

Особисто:
1. Прийти з паспортом або студентским квитком
2. Заповнити читацький формуляр
3. Отримати читацький квиток

Дистанційно (на час воєнного стану):
📧 Email: abon@xdak.ukr.education
📱 Viber/Telegram: +380661458484
💬 Facebook: http://m.me/641740969354328
📸 Instagram: @hdak_lib

Адреса: вул. Бурсацький узвіз, 4, Харків
(ст. метро \xabІсторичний музей\xbb)`,chips:["Графік роботи","Правила","Де знаходиться?"]},{triggers:["графік","години","коли","до котрої","вихідні","субота"],content:`Графік роботи бібліотеки ХДАК:

🏛 Загальний: 9:00 – 17:00

📚 Абонементи + інформаційно-бібліографічний відділ:
   Пн–Пт: 9:00–16:45 (перерва 13:00–13:45)
   Вихідні: субота, неділя
   Санітарний день: остання п'ятниця місяця

📖 Читальна зала:
   Пн–Пт: 9:00–16:45
   Субота: 9:00–13:30
   Санітарний день: останній четвер місяця

💻 Сектор автоматизації (е-читальна зала, кімн. 18а):
   Пн–Пт: 9:00–16:45 (перерва 13:00–13:45)
   Вихідні: субота, неділя
   Санітарний день: останній четвер місяця`,chips:["Адреса та проїзд","Записатися","Контакти"]},{triggers:["контакти","телефон","адреса","email","де знаходиться","як дістатися"],content:`Контакти бібліотеки ХДАК:

📍 Адреса: вул. Бурсацький узвіз, 4, м. Харків, 61057
   Метро: ст. \xabІсторичний музей\xbb

📞 Телефони:
   (057) 731-27-83
   (057) 731-13-85

📧 Email (запис): abon@xdak.ukr.education
📱 Viber/Telegram: +380 66 145 84 84
💬 Facebook: m.me/641740969354328
📸 Instagram: instagram.com/hdak_lib

🌐 Сайт: https://lib-hdak.in.ua/
📋 Контакти: https://lib-hdak.in.ua/contacts.html

Директор: Кирпа Тетяна Олександрівна (кімн. 16)`,chips:["Графік роботи","Записатися","Структура бібліотеки"]},{triggers:["правила","можна","не можна","штраф","борг","загубив книгу"],content:`Правила користування бібліотекою ХДАК:
https://lib-hdak.in.ua/rules-library.html

Обов'язки читача:
1. Відвідувати бібліотеку лише з читацьким квитком
2. Ставити підпис за кожне отримане видання
3. Повертати видання вчасно
4. Не передавати квиток іншим особам
5. Дотримуватися тиші, не використовувати телефон
6. При втраті — замінити рівноцінним виданням або ксерокопією, або розрахуватися готівкою.
7. Наприкінці семестру/навчального року повернути всі видання.

⚠️ При порушенні — позбавлення права користування на термін, встановлений бібліотекою.`,chips:["Правила е-читальної зали","Записатися","Графік"]},{triggers:["scopus","web of science","наукова база","статті","дисертація","автореферат","наукові джерела"],content:`Наукові ресурси доступні через бібліотеку ХДАК:

🆓 Відкритий доступ:
• Репозитарій ХДАК: https://repository.ac.kharkov.ua/home
• Електронна бібліотека \xabКультура України\xbb: http://elib.nplu.org/
• Springer Link: https://link.springer.com/

🔐 Корпоративний доступ (мережа академії або VPN):
• Scopus: https://www.scopus.com/
• Web of Science: https://www.webofscience.com/
• ScienceDirect: https://www.sciencedirect.com/

💡 Потрібна допомога з пошуком джерел? Заповніть форму: https://lib-hdak.in.ua/search-scientific-info.html`,chips:["Репозитарій ХДАК","Авторські профілі","Пошук наукової інформації"]},{triggers:["е-читальна зала","електронна зала","комп'ютер","інтернет в бібліотеці"],content:`Електронна читальна зала (ЕЧЗ) ХДАК:

📍 Розташування: головний корпус, 2-й поверх, кімн. 18а
⏰ Графік: Пн–Пт 9:00–16:45 (перерва 13:00–13:45)
   Вихідні: субота, неділя.

✅ Послуги:
• Доступ до електронного каталогу і репозитарію ХДАК
• Пошук в інтернеті
• Копіювання інформації на носії

Правила: https://lib-hdak.in.ua/rules-library-e-reading-room.html`,chips:["Правила е-читальної зали","Репозитарій","Графік роботи"]},{triggers:["єдина картка","інші університети","каразіна","картка читача"],content:`Проєкт \xabЄдина картка читача\xbb м. Харкова:
https://lib-hdak.in.ua/project-unified-reader-card.html

ХДАК є учасником проєкту з лютого 2016 року.
Дає безкоштовний доступ до фондів усіх бібліотек-учасниць.
📍 Де отримати: ЦНБ імені В.Н. Каразіна, кімн. 7-50. Тел.: 707-56-74.
При собі мати читацький квиток ХДАК!`,chips:["Записатися до ХДАК","Графік","Контакти"]},{triggers:["репозитарій","підручники онлайн","навчальні матеріали","скачати"],content:`Репозитарій ХДАК — відкритий цифровий архів:
https://repository.ac.kharkov.ua/home

Містить:
• Повнотекстові підручники та навчальні посібники
• Навчально-методичні матеріали
• Монографії викладачів
• Наукові статті
🆓 Доступ: відкритий, без реєстрації`,chips:["Наукові бази даних","Публікації вчених","Каталог"]}];async function x(a,{params:b}){try{let{id:a}=await b,c=parseInt(a),d=await u.K.getMessagesByConversation(c);return Response.json(d)}catch(a){return Response.json({error:"Failed to fetch messages"},{status:500})}}async function y(a,{params:b}){try{let{id:c}=await b,d=parseInt(c),{content:e}=await a.json(),f=process.env.BUILT_IN_FORGE_API_KEY||process.env.OPENAI_API_KEY,g=process.env.BUILT_IN_FORGE_API_URL||"https://api.openai.com/v1/chat/completions",h=process.env.AI_MODEL_NAME||"gpt-4o-mini";if(!f)return Response.json({error:"API key not configured"},{status:500});await u.K.createMessage(d,"user",e);let i=await u.K.getMessagesByConversation(d),j=`Ти — офіційний чат-помічник бібліотеки Харківської державної академії культури (ХДАК). 
Твоя мета: допомагати користувачам знаходити книги, записуватися до бібліотеки та користуватися її ресурсами.

=== ПРАВИЛА ВІДПОВІДЕЙ ===
1. Відповідай коротко, точно, по-українськи.
2. Використовуй тільки перевірену інформацію з бази знань нижче.
3. Якщо користувач запитує те, чого немає в базі — направляй на офіційний сайт (https://lib-hdak.in.ua/) або контакти директора (кімн. 16).
4. Обов'язково додавай посилання, якщо вони є в тексті.

=== БАЗА ЗНАНЬ ===

1. КАТАЛОГ (тригери: каталог, знайти книгу, пошук, є у вас, автор):
Електронний каталог бібліотеки ХДАК:
🔍 Пошук: https://library-service.com.ua:8443/khkhdak/DocumentSearchForm
📄 Сторінка: https://lib-hdak.in.ua/e-catalog.html
Пошук за: автором, назвою, темою, роком видання, анотацією. При пошуку за назвою — шукайте за окремими словами.
📱 Мобільний додаток Android: https://play.google.com/store/apps/details?id=ush.libclient
Адреса для налаштування: https://ush.com.ua/khkhdak

2. ЗАПИСАТИСЯ (тригери: записатися, стати читачем, читацький квиток, реєстрація):
Запис до бібліотеки ХДАК:
Особисто: паспорт/студентський квиток, заповнити формуляр у бібліотеці.
Дистанційно: Email abon@xdak.ukr.education, Viber/Telegram +380661458484, Facebook http://m.me/641740969354328, Instagram @hdak_lib
📍 Адреса: вул. Бурсацький узвіз, 4, Харків (м. Історичний музей)

3. ГРАФІК (тригери: графік, години, коли, вихідні, субота):
🏛 Загальний: 9:00 – 17:00
📚 Абонементи + бібліографія: Пн–Пт 9:00–16:45 (перерва 13:00–13:45). Вихідні: сб, нд. Сандень: остання п'ятниця місяця.
📖 Читальна зала: Пн–Пт 9:00–16:45. Субота: 9:00–13:30. Сандень: останній четвер місяця.
💻 Е-читальна зала: Пн–Пт 9:00–16:45. Вихідні: сб, нд.

4. КОНТАКТИ (тригери: телефон, адреса, email, де знаходиться):
📍 Адреса: вул. Бурсацький узвіз, 4, м. Харків, 61057 (ст. \xabІсторичний музей\xbb)
📞 Телефони: (057) 731-27-83, (057) 731-13-85
📧 Email: abon@xdak.ukr.education
📱 Viber/Telegram: +380 66 145 84 84
🌐 Сайт: https://lib-hdak.in.ua/

5. ПРАВИЛА (тригери: правила, можна, штраф, борг, загубив):
Правила: https://lib-hdak.in.ua/rules-library.html
Коротко: квиток обов'язковий, повертати вчасно, тиша, не передавати квиток іншим. При втраті — заміна або грошове відшкодування.

6. НАУКОВІ БАЗИ (тригери: scopus, web of science, статті, дисертація):
Репозитарій: https://repository.ac.kharkov.ua/home
Scopus: https://www.scopus.com/
Web of Science: https://www.webofscience.com/
Research 4 Life: https://login.research4life.org/tacsgr1portal_research4life_org/

7. Е-ЧИТАЛЬНА ЗАЛА (тригери: е-читальна зала, комп'ютер, інтернет):
Локація: кімн. 18а. Пн–Пт 9:00–16:45. Пошук в інтернеті, доступ до каталогу, копіювання.

8. ЄДИНА КАРТКА (тригери: єдина картка, каразіна):
Дає доступ до фондів усіх бібліотек-учасниць Харкова. Отримати: ЦНБ ім. Каразіна, кімн. 7-50.

9. РЕПОЗИТАРІЙ (тригери: репозитарій, підручники онлайн, скачати):
Цифровий архів: https://repository.ac.kharkov.ua/home. Підручники, статті, монографії викладачів ХДАК.`,k=[{role:"system",content:j},...i.map(a=>({role:a.role,content:a.content}))],l=function(a){let b=a.toLowerCase();for(let a of w)if(a.triggers.some(a=>b.includes(a)))return a;return null}(e),m=new TextEncoder,n="";if(l){let a=l.content+(l.chips?`

[CHIPS: ${l.chips.join(", ")}]`:""),b=new ReadableStream({start(b){b.enqueue(m.encode(a)),u.K.createMessage(d,"assistant",a).catch(console.error),b.close()}});return new Response(b,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-cache"}})}console.log(`Sending message to LLM. URL: ${g}, Model: ${h}`);let o=new ReadableStream({async start(a){try{let b=await fetch(g,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${f}`,"HTTP-Referer":process.env.OPENROUTER_HTTP_REFERER||"https://hdak-lib-chatbot.onrender.com","X-Title":process.env.OPENROUTER_X_TITLE||"HDAK Library Chatbot"},body:JSON.stringify({model:h,messages:k,stream:!0})});if(!b.ok){let a=await b.text();throw console.error("LLM API Error Response:",a),Error(`LLM API error: ${b.status}`)}let c=b.body?.getReader();if(!c)throw Error("No response stream");let e=new TextDecoder,i="";for(;;){let{done:b,value:d}=await c.read();if(b)break;let f=(i+=e.decode(d,{stream:!0})).split("\n");for(let b of(i=f.pop()??"",f)){if(!b.startsWith("data: "))continue;let c=b.slice(6).trim();if(c&&"[DONE]"!==c)try{let b=JSON.parse(c),d=b.choices?.[0]?.delta?.content;"string"==typeof d&&(n+=d,a.enqueue(m.encode(d)))}catch{}}}await u.K.createMessage(d,"assistant",n),a.close()}catch(b){console.error("Stream error:",b);try{a.close()}catch(a){}}}});return new Response(o,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache",Connection:"keep-alive"}})}catch(a){return console.error("CRITICAL ERROR in POST /api/conversations/[id]/messages:",a),new Response(JSON.stringify({error:"Failed to send message",details:a instanceof Error?a.message:String(a)}),{status:500,headers:{"Content-Type":"application/json"}})}}let z=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/conversations/[id]/messages/route",pathname:"/api/conversations/[id]/messages",filename:"route",bundlePath:"app/api/conversations/[id]/messages/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\Administrator\\Documents\\dev\\hdak-lib-chatbot\\app\\api\\conversations\\[id]\\messages\\route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:A,workUnitAsyncStorage:B,serverHooks:C}=z;function D(){return(0,g.patchFetch)({workAsyncStorage:A,workUnitAsyncStorage:B})}async function E(a,b,c){var d;let e="/api/conversations/[id]/messages/route";"/index"===e&&(e="/");let g=await z.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:A,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,resolvedPathname:D}=g,E=(0,j.normalizeAppPath)(e),F=!!(y.dynamicRoutes[E]||y.routes[D]);if(F&&!x){let a=!!y.routes[D],b=y.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||z.isDev||x||(G="/index"===(G=D)?"/":G);let H=!0===z.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>z.onRequestError(a,b,d,A)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>z.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&B&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await z.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})},A),b}},l=await z.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",B?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await z.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},8335:()=>{},9294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")}};var b=require("../../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[873,801],()=>b(b.s=7562));module.exports=c})();