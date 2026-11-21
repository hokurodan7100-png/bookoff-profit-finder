async function w(e,t,s){let r=await fetch(t,{method:e,headers:s!==void 0?{"content-type":"application/json"}:void 0,body:s!==void 0?JSON.stringify(s):void 0}),a=await r.json().catch(()=>({}));if(!r.ok)throw new Error(a.error??`HTTP ${r.status}`);return a}var x={meta:()=>w("GET","/api/meta"),items:e=>w("GET",`/api/items?${e}`),product:e=>w("GET",`/api/products/${e}`),createProduct:e=>w("POST","/api/products",e),updateProduct:(e,t)=>w("PUT",`/api/products/${e}`,t),deleteProduct:e=>w("DELETE",`/api/products/${e}`),deleteOffer:e=>w("DELETE",`/api/offers/${e}`),deletePrice:e=>w("DELETE",`/api/market-prices/${e}`),addOffer:e=>w("POST","/api/offers",e),addPrice:e=>w("POST","/api/market-prices",e),importCsv:(e,t,s)=>w("POST",`/api/import/${e}`,{csv:t,filename:s}),diffStores:(e,t)=>w("POST","/api/import/stores?dryRun=1",{csv:e,filename:t}),recomputeEstimates:()=>w("POST","/api/estimates/recompute"),duplicates:()=>w("GET","/api/duplicates"),mergeProducts:(e,t)=>w("POST","/api/products/merge",{keepId:e,mergeIds:t}),stores:()=>w("GET","/api/stores"),storeSummary:(e="all")=>w("GET",`/api/store-summary?dataKind=${e}`),storeEvents:e=>w("GET",`/api/stores/${e}/events`),settings:()=>w("GET","/api/settings"),saveSettings:e=>w("PUT","/api/settings",e),providers:()=>w("GET","/api/providers"),runProvider:e=>w("POST",`/api/providers/${e}/fetch`),runBulk:async e=>(await w("POST",`/api/providers/${e}/fetch`)).bulk,seedDemo:()=>w("POST","/api/demo"),deleteDemo:()=>w("DELETE","/api/demo")};var G=class{constructor(t){this.value=t}value},C=e=>new G(e);function Me(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function de(e){return e==null||e===!1?"":e instanceof G?e.value:Array.isArray(e)?e.map(de).join(""):Me(e)}function n(e,...t){let s="";return e.forEach((r,a)=>{s+=r+(a<t.length?de(t[a]):"")}),new G(s)}function $(e,t){e.innerHTML=t.value}var d=(e,t=document)=>t.querySelector(e),F=(e,t=document)=>Array.from(t.querySelectorAll(e));function S(e,t,s,r){return n`${r!==void 0?n`<option value="">${r}</option>`:""}${e.map(a=>n`<option value="${a}" ${a===t?C("selected"):""}>${s?.[a]??a}</option>`)}`}function f(e,t="ok"){let s=document.createElement("div");s.setAttribute("role","status"),s.className=`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2 text-sm shadow-lg ${t==="ok"?"bg-slate-900 text-white":"bg-red-600 text-white"}`,s.textContent=e,document.body.appendChild(s),setTimeout(()=>s.remove(),3500)}function pe(e,t){let s;return(...r)=>{s&&clearTimeout(s),s=setTimeout(()=>e(...r),t)}}var te={core:"\u7DCF\u5408",related:"\u95A2\u9023\u696D\u614B"};var se=["\u672C","CD","DVD\u30FBBD","\u30B2\u30FC\u30E0","\u30DB\u30D3\u30FC","\u5BB6\u96FB","\u305D\u306E\u4ED6"];var A=["mercari","yahoo_fleamarket","amazon_used"],M={mercari:"\u30E1\u30EB\u30AB\u30EA",yahoo_fleamarket:"Yahoo!\u30D5\u30EA\u30DE",amazon_used:"Amazon\u4E2D\u53E4"};var B={listing:"\u51FA\u54C1\u4FA1\u683C",sold:"\u58F2\u5374\u6E08\u307F\u4FA1\u683C",estimate:"\u63A8\u5B9A\u76F8\u5834"};var v="\u672A\u53D6\u5F97";var Re=["profit_desc","margin_desc","price_asc","updated_desc","premium_desc"];function V(e){if(e==null||e.trim()==="")return;let t=Number(e);return Number.isFinite(t)?t:void 0}function D(e){let t=e?.trim();return t||void 0}function X(e){let t=e.get("sort"),s=e.get("dataKind"),r=e.get("marketplace");return{q:D(e.get("q")),code:D(e.get("code")),prefecture:D(e.get("prefecture")),store:D(e.get("store")),storeId:V(e.get("storeId")),brandType:D(e.get("brandType")),category:D(e.get("category")),minProfit:V(e.get("minProfit")),minMargin:V(e.get("minMargin")),priceMin:V(e.get("priceMin")),priceMax:V(e.get("priceMax")),stockStatus:D(e.get("stockStatus")),marketSince:D(e.get("marketSince")),dataKind:s==="real"||s==="demo"?s:"all",profitOnly:e.get("profitOnly")!=="0",marketplace:r&&A.includes(r)?r:void 0,premiumOnly:e.get("premiumOnly")==="1",belowList:e.get("belowList")==="1",bothOver:e.get("bothOver")==="1",needsFleaCheck:e.get("needsFleaCheck")==="1",sort:t&&Re.includes(t)?t:"profit_desc"}}function ue(e){let t=new URLSearchParams;for(let[s,r]of Object.entries(e))if(!(r==null||r==="")){if(s==="profitOnly"){r===!1&&t.set(s,"0");continue}if(s==="premiumOnly"||s==="belowList"||s==="bothOver"||s==="needsFleaCheck"){r===!0&&t.set(s,"1");continue}t.set(s,String(r))}return t}function ae(e,t){return t?e.markets[t]?.profit??null:e.bestProfit}function k(e){return e==null||!Number.isFinite(e)?v:`${e<0?"\u2212":""}\xA5${Math.abs(e).toLocaleString("ja-JP")}`}function I(e){return e==null||!Number.isFinite(e)?v:e>0?`+${k(e)}`:k(e)}function H(e){return e==null||!Number.isFinite(e)?v:`${e.toFixed(1)}%`}function P(e){if(!e)return v;let t=Date.parse(e);if(Number.isNaN(t))return v;let s=new Date(t+9*3600*1e3),r=a=>String(a).padStart(2,"0");return`${s.getUTCFullYear()}/${r(s.getUTCMonth()+1)}/${r(s.getUTCDate())} ${r(s.getUTCHours())}:${r(s.getUTCMinutes())}`}var Ce="\u8981\u518D\u78BA\u8A8D";var me=864e5;function fe(e,t,s=Date.now()){if(!e)return{status:"\u5728\u5EAB\u672A\u78BA\u8A8D",ageDays:null};let r=e.checkedAt?Date.parse(e.checkedAt):NaN,a=Number.isNaN(r)?null:Math.max(0,s-r),i=a==null?null:Math.floor(a/me);return e.stockStatus==="\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09"&&t>0&&a!=null&&a>t*me?{status:Ce,ageDays:i}:{status:e.stockStatus,ageDays:i}}function be(e){return e==null?"":e===0?"\u4ECA\u65E5\u78BA\u8A8D":`${e}\u65E5\u524D\u306B\u78BA\u8A8D`}function Fe(e,t){return t==="floor"?Math.floor(e):t==="ceil"?Math.ceil(e):Math.round(e)}function re(e){let{salePrice:t,purchasePrice:s}=e;if(t==null||s==null||!Number.isFinite(t)||!Number.isFinite(s)||t<=0||s<0)return null;let a=Math.max(Fe(t*e.feeRatePercent/100,e.rounding??"floor"),e.minFee??0)+(e.fixedFee??0),i=t-s-a-e.shipping-e.otherCost,l=o=>Math.round(o*10)/10;return{salePrice:t,fee:a,shipping:e.shipping,otherCost:e.otherCost,profit:i,marginPercent:l(i/t*100),roiPercent:s>0?l(i/s*100):null}}function J(e,t){let s=t?e.categoryFees?.[t]:void 0;return{feeRatePercent:s?.feeRatePercent??e.feeRatePercent,fixedFee:s?.fixedFee??0,minFee:s?.minFee??0}}function Ie(e){let t={listing:null,sold:null,estimate:null};for(let s of e){let r=t[s.priceType];(!r||s.observedAt>r.observedAt||s.observedAt===r.observedAt&&s.id>r.id)&&(t[s.priceType]=s)}return t}function ge(e){let{settings:t}=e,s={},r=null,a=null;for(let i of A){let l=Ie(e.prices.filter(b=>b.marketplace===i)),o=null;for(let b of t.priceTypePriority)if(l[b]){o=l[b];break}let c=t.marketplaces[i];if(!c){s[i]={marketplace:i,latest:l,chosen:o,profit:null};continue}let p=J(c,e.category),m=re({salePrice:o?.price??null,purchasePrice:e.purchasePrice,feeRatePercent:p.feeRatePercent,fixedFee:p.fixedFee,minFee:p.minFee,shipping:e.shippingOverride??c.shipping,otherCost:e.otherCostOverride??t.otherCost,rounding:t.rounding});s[i]={marketplace:i,latest:l,chosen:o,profit:m},m&&(!a||m.profit>a.profit)&&(r=i,a=m)}return{markets:s,best:r,bestProfit:a}}function Z(e,t,s="dialog"){let r=document.createElement("dialog");return r.className="m-auto w-[min(56rem,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/50",r.dataset.testid=s,$(r,n`<div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <h2 class="font-semibold">${e}</h2>
      <button class="rounded p-1 text-slate-500 hover:bg-slate-100" data-close aria-label="閉じる">✕</button></div>
    <div class="p-4" data-body>${t}</div>`),r.addEventListener("click",a=>{(a.target===r||a.target.closest("[data-close]"))&&r.close()}),r.addEventListener("close",()=>r.remove()),document.body.appendChild(r),r.showModal(),r}var Be=()=>new Date(Date.now()+324e5).toISOString().slice(0,16);async function K(e,t,s){let r=Z("\u5546\u54C1\u8A73\u7D30",n`<p class="text-slate-500">読み込み中…</p>`,"detail-dialog"),a=d("[data-body]",r),i=async()=>{let[{product:l,offers:o,prices:c},p,{stores:m}]=await Promise.all([x.product(e),x.settings(),x.stores()]),b=u=>ge({prices:c,purchasePrice:u,settings:p,shippingOverride:l.shippingOverride,otherCostOverride:l.otherCostOverride,category:l.category}),h=o[0]??null,{markets:y}=b(h?.price??null),T=u=>{let g=y[u],L=g.profit,R=J(p.marketplaces[u],l.category);return n`<div class="rounded-lg border border-slate-200 p-3" data-testid="calc-${u}">
        <div class="mb-2 font-semibold">${M[u]}</div>
        ${L?n`<dl class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm tabular-nums">
          <dt>想定販売価格（${B[g.chosen.priceType]}）</dt><dd class="text-right">${k(L.salePrice)}</dd>
          <dt>− 仕入れ価格</dt><dd class="text-right">${k(h?.price)}</dd>
          <dt>− 販売手数料（${R.feeRatePercent}%${R.minFee?`\u30FB\u6700\u4F4E${R.minFee}\u5186`:""}${R.fixedFee?`\uFF0B\u6210\u7D04\u6599${R.fixedFee}\u5186`:""}）</dt><dd class="text-right">${k(L.fee)}</dd>
          <dt>− 送料</dt><dd class="text-right">${k(L.shipping)}</dd>
          <dt>− その他費用</dt><dd class="text-right">${k(L.otherCost)}</dd>
          <dt class="border-t pt-1 font-semibold">想定利益</dt><dd class="border-t pt-1 text-right font-bold ${_(L.profit)}">${I(L.profit)}</dd>
          <dt>利益率 / 投資利益率</dt><dd class="text-right">${H(L.marginPercent)} / ${H(L.roiPercent)}</dd></dl>`:n`<p class="text-sm text-slate-500">${g.chosen?"\u4ED5\u5165\u308C\u4FA1\u683C\u304C\u672A\u53D6\u5F97\u306E\u305F\u3081\u8A08\u7B97\u3067\u304D\u307E\u305B\u3093":`\u76F8\u5834${v}\u306E\u305F\u3081\u8A08\u7B97\u3067\u304D\u307E\u305B\u3093`}</p>`}
      </div>`};$(a,n`
      <div class="flex flex-wrap items-start gap-3">
        <div class="ml-auto flex gap-2 order-2"><button type="button" class="btn-secondary !py-1 text-xs" id="edit-product">商品情報を編集</button>
          <button type="button" class="btn-danger !py-1 text-xs" id="delete-product">商品を削除</button></div>
        <div class="min-w-0 flex-1"><h3 class="text-lg font-semibold">${l.name} ${l.isDemo?Y():""}</h3>
          <div class="mt-1 text-sm text-slate-500">${l.category}・JAN ${l.jan??v}・ISBN ${l.isbn??v}・定価 ${k(l.listPrice)}${l.listPriceSource?`\uFF08${l.listPriceSource}\uFF09`:""}</div>
          <div class="text-xs text-slate-400">情報取得元：${l.source}</div></div>
      </div>
      <div id="edit-wrap" class="hidden"><form id="edit-form" class="mt-3 grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
        <label class="sm:col-span-2"><span class="lbl">商品名</span><input class="inp" name="name" required maxlength="300" value="${l.name}"></label>
        <label><span class="lbl">JAN（8/13桁）</span><input class="inp" name="jan" inputmode="numeric" pattern="\\d{8}|\\d{13}" value="${l.jan??""}"></label>
        <label><span class="lbl">ISBN（10/13桁）</span><input class="inp" name="isbn" value="${l.isbn??""}"></label>
        <label><span class="lbl">カテゴリ</span><select class="inp" name="category">${S(t.categories,l.category)}</select></label>
        <label><span class="lbl">定価（税込・円）</span><input class="inp" name="listPrice" type="number" min="1" value="${l.listPrice??""}"></label>
        <label><span class="lbl">送料（個別・円）</span><input class="inp" name="shippingOverride" type="number" min="0" placeholder="空欄=設定値" value="${l.shippingOverride??""}"></label>
        <label><span class="lbl">その他費用（個別・円）</span><input class="inp" name="otherCostOverride" type="number" min="0" placeholder="空欄=設定値" value="${l.otherCostOverride??""}"></label>
        <label class="sm:col-span-2"><span class="lbl">画像URL</span><input class="inp" name="imageUrl" type="url" value="${l.imageUrl??""}"></label>
        <div class="flex gap-2 sm:col-span-2"><button class="btn-primary">保存</button><button type="button" class="btn-secondary" id="edit-cancel">やめる</button></div>
      </form></div>
      ${l.isDemo?n`<p class="mt-2 rounded bg-violet-50 p-2 text-xs text-violet-800">これは架空のデモデータです。価格・在庫は実在しません。</p>`:""}

      <h4 class="mt-5 mb-2 font-semibold">利益計算（${h?.store?.name??"\u5148\u982D\u306E\u5728\u5EAB"}の価格で計算）</h4>
      <div class="grid gap-3 md:grid-cols-3">${A.map(T)}</div>

      <h4 class="mt-5 mb-2 font-semibold">在庫・BOOKOFF価格</h4>
      ${o.length?n`<ul class="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">${o.map(u=>n`
        <li class="flex flex-wrap items-center gap-2 p-2"><span class="font-medium">${u.store?.name??`\u5E97\u8217${v}`}</span>
          <span class="tabular-nums">${k(u.price)}</span>${(()=>{let g=fe(u,p.stockFreshDays);return j(g.status,g.ageDays)})()}<span class="text-xs text-slate-500">${u.condition}</span>
          <span class="ml-auto text-xs text-slate-400">確認 ${P(u.checkedAt)}・${u.source}</span>
          <button type="button" class="rounded px-1.5 text-xs text-red-600 hover:bg-red-50" data-del-offer="${u.id}" aria-label="この在庫情報を削除">削除</button></li>`)}</ul>`:n`<p class="text-sm text-slate-500">在庫情報は${v}です。</p>`}

      <h4 class="mt-5 mb-2 font-semibold">相場の履歴</h4>
      ${c.length?n`<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="text-left text-xs text-slate-500">
        <tr><th class="p-1">販路</th><th class="p-1">種別</th><th class="p-1 text-right">価格</th><th class="p-1 text-right">件数</th><th class="p-1">取得日時</th><th class="p-1">取得元</th><th class="p-1"></th></tr></thead>
        <tbody>${c.map(u=>n`<tr class="border-t border-slate-100"><td class="p-1">${M[u.marketplace]}</td>
          <td class="p-1">${B[u.priceType]}</td><td class="p-1 text-right tabular-nums">${k(u.price)}</td>
          <td class="p-1 text-right">${u.sampleCount??v}</td><td class="p-1 whitespace-nowrap">${P(u.observedAt)}</td>
          <td class="p-1 text-xs text-slate-500">${u.source}${u.note?`\uFF08${u.note}\uFF09`:""}</td>
          <td class="p-1"><button type="button" class="rounded px-1.5 text-xs text-red-600 hover:bg-red-50" data-del-price="${u.id}" aria-label="この相場を削除">削除</button></td></tr>`)}</tbody></table></div>`:n`<p class="text-sm text-slate-500">相場は${v}です。</p>`}

      <div class="mt-6 grid gap-4 md:grid-cols-2">
        <form id="price-form" class="space-y-2 rounded-lg bg-slate-50 p-3">
          <div class="font-semibold">相場を手動登録</div>
          <p class="text-xs text-slate-500">各アプリ・Amazonの商品ページで確認した価格を入力します。</p>
          <div class="grid grid-cols-2 gap-2">
            <label><span class="lbl">販路</span><select class="inp" name="marketplace">${S(t.marketplaces,"mercari",t.marketplaceLabel)}</select></label>
            <label><span class="lbl">価格種別</span><select class="inp" name="priceType">${S(t.priceTypes,"sold",t.priceTypeLabel)}</select></label>
            <label><span class="lbl">価格（円）</span><input class="inp" name="price" type="number" min="1" required inputmode="numeric"></label>
            <label><span class="lbl">サンプル数</span><input class="inp" name="sampleCount" type="number" min="0" inputmode="numeric"></label>
          </div>
          <label class="block"><span class="lbl">取得日時</span><input class="inp" name="observedAt" type="datetime-local" required value="${Be()}"></label>
          <label class="block"><span class="lbl">備考</span><input class="inp" name="note" maxlength="300"></label>
          <button class="btn-primary w-full">相場を登録</button>
        </form>
        <form id="offer-form" class="space-y-2 rounded-lg bg-slate-50 p-3">
          <div class="font-semibold">在庫・価格を登録／更新</div>
          <p class="text-xs text-slate-500">同じ店舗の既存情報は上書きされます。確認日時がない場合は「在庫未確認」になります。</p>
          <label class="block"><span class="lbl">店舗</span><select class="inp" name="storeId"><option value="">店舗未指定</option>
            ${t.prefectures.map(u=>n`<optgroup label="${u}">${m.filter(g=>g.prefecture===u).map(g=>n`<option value="${g.id}">${g.name}${g.status!=="\u55B6\u696D\u4E2D"?`\uFF08${g.status}\uFF09`:""}</option>`)}</optgroup>`)}</select></label>
          <div class="grid grid-cols-2 gap-2">
            <label><span class="lbl">BOOKOFF価格（円）</span><input class="inp" name="price" type="number" min="0" inputmode="numeric"></label>
            <label><span class="lbl">商品状態</span><select class="inp" name="condition">${S(t.conditions,"\u72B6\u614B\u672A\u78BA\u8A8D")}</select></label>
            <label><span class="lbl">在庫状態</span><select class="inp" name="stockStatus">${S(t.stockStatuses,"\u5728\u5EAB\u672A\u78BA\u8A8D")}</select></label>
            <label><span class="lbl">在庫確認日時</span><input class="inp" name="checkedAt" type="datetime-local"></label>
          </div>
          <button class="btn-primary w-full">在庫を登録</button>
        </form>
      </div>`);let O=d("#edit-form",a),E=d("#edit-wrap",a);d("#edit-product",a).addEventListener("click",()=>E.classList.toggle("hidden")),d("#edit-cancel",a).addEventListener("click",()=>E.classList.add("hidden")),O.addEventListener("submit",async u=>{u.preventDefault();let g=new FormData(O),L=R=>String(g.get(R)??"").trim()?Number(g.get(R)):null;try{await x.updateProduct(e,{name:String(g.get("name")),jan:String(g.get("jan")??"").trim(),isbn:String(g.get("isbn")??"").trim(),category:String(g.get("category")),imageUrl:String(g.get("imageUrl")??"").trim(),listPrice:L("listPrice"),shippingOverride:L("shippingOverride"),otherCostOverride:L("otherCostOverride")}),f("\u5546\u54C1\u60C5\u5831\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F"),s(),await i()}catch(R){f(R.message,"error")}}),d("#delete-product",a).addEventListener("click",async()=>{if(confirm(`\u300C${l.name}\u300D\u3068\u3001\u305D\u306E\u5728\u5EAB\u30FB\u76F8\u5834\u306E\u8A18\u9332\u3092\u3059\u3079\u3066\u524A\u9664\u3057\u307E\u3059\u3002\u5143\u306B\u623B\u305B\u307E\u305B\u3093\u3002\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F`))try{await x.deleteProduct(e),f("\u5546\u54C1\u3092\u524A\u9664\u3057\u307E\u3057\u305F"),r.close(),s()}catch(u){f(u.message,"error")}}),a.querySelectorAll("[data-del-offer], [data-del-price]").forEach(u=>u.addEventListener("click",async()=>{let g=!!u.dataset.delOffer;if(confirm(g?"\u3053\u306E\u5E97\u8217\u306E\u5728\u5EAB\u30FB\u4FA1\u683C\u306E\u8A18\u9332\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F":"\u3053\u306E\u76F8\u5834\u306E\u8A18\u9332\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F"))try{g?await x.deleteOffer(Number(u.dataset.delOffer)):await x.deletePrice(Number(u.dataset.delPrice)),f("\u524A\u9664\u3057\u307E\u3057\u305F"),s(),await i()}catch(L){f(L.message,"error")}})),d("#price-form",a).addEventListener("submit",async u=>{u.preventDefault();let g=new FormData(u.target);try{await x.addPrice({productId:e,marketplace:g.get("marketplace"),priceType:g.get("priceType"),price:Number(g.get("price")),sampleCount:g.get("sampleCount")?Number(g.get("sampleCount")):null,observedAt:String(g.get("observedAt")),note:String(g.get("note")??"")}),f("\u76F8\u5834\u3092\u767B\u9332\u3057\u307E\u3057\u305F"),s(),await i()}catch(L){f(L.message,"error")}}),d("#offer-form",a).addEventListener("submit",async u=>{u.preventDefault();let g=new FormData(u.target);try{await x.addOffer({productId:e,storeId:g.get("storeId")?Number(g.get("storeId")):null,price:g.get("price")?Number(g.get("price")):null,condition:String(g.get("condition")),stockStatus:String(g.get("stockStatus")),checkedAt:String(g.get("checkedAt")??"")}),f("\u5728\u5EAB\u3092\u767B\u9332\u3057\u307E\u3057\u305F"),s(),await i()}catch(L){f(L.message,"error")}})};try{await i()}catch(l){$(a,n`<p class="text-red-600">${l.message}</p>`)}}function xe(e,t){let s=Z("\u5546\u54C1\u3092\u624B\u52D5\u767B\u9332",n`<form id="create-form" class="space-y-3">
    <label class="block"><span class="lbl">商品名 *</span><input class="inp" name="name" required maxlength="300"></label>
    <div class="grid grid-cols-2 gap-2">
      <label><span class="lbl">JAN（8/13桁）</span><input class="inp" name="jan" inputmode="numeric" pattern="\\d{8}|\\d{13}"></label>
      <label><span class="lbl">ISBN（10/13桁）</span><input class="inp" name="isbn" inputmode="numeric" pattern="\\d{9}[\\dXx]|\\d{13}"></label>
      <label><span class="lbl">カテゴリ *</span><select class="inp" name="category">${S(e.categories,"\u672C")}</select></label>
      <label><span class="lbl">定価（税込・円）</span><input class="inp" name="listPrice" type="number" min="1" inputmode="numeric"></label>
      <label><span class="lbl">画像URL</span><input class="inp" name="imageUrl" type="url"></label>
      <label><span class="lbl">送料（個別・円）</span><input class="inp" name="shippingOverride" type="number" min="0" placeholder="空欄=設定値"></label>
      <label><span class="lbl">その他費用（個別・円）</span><input class="inp" name="otherCostOverride" type="number" min="0" placeholder="空欄=設定値"></label>
    </div>
    <p class="text-xs text-slate-500">登録後に開く詳細画面で、在庫・BOOKOFF価格と相場を追加できます。</p>
    <button class="btn-primary w-full">登録して詳細を開く</button></form>`,"create-dialog");d("#create-form",s).addEventListener("submit",async r=>{r.preventDefault();let a=new FormData(r.target),i=l=>a.get(l)?Number(a.get(l)):null;try{let l=await x.createProduct({name:String(a.get("name")),jan:String(a.get("jan")??""),isbn:String(a.get("isbn")??""),category:String(a.get("category")),imageUrl:String(a.get("imageUrl")??""),shippingOverride:i("shippingOverride"),otherCostOverride:i("otherCostOverride"),listPrice:i("listPrice")});s.close(),f("\u5546\u54C1\u3092\u767B\u9332\u3057\u307E\u3057\u305F"),t(),K(l.id,e,t)}catch(l){f(l.message,"error")}})}var he={profit_desc:"\u5229\u76CA\u984D\u304C\u9AD8\u3044\u9806",margin_desc:"\u5229\u76CA\u7387\u304C\u9AD8\u3044\u9806",price_asc:"\u4ED5\u5165\u308C\u4FA1\u683C\u304C\u5B89\u3044\u9806",updated_desc:"\u66F4\u65B0\u65E5\u6642\u304C\u65B0\u3057\u3044\u9806",premium_desc:"\u30D7\u30EC\u30DF\u30A2\u7387\u304C\u9AD8\u3044\u9806\uFF08Amazon\u4E2D\u53E4\xF7\u5B9A\u4FA1\uFF09"},_=e=>e==null?"text-slate-400":e>0?"text-emerald-600":e<0?"text-red-600":"text-slate-700";function j(e,t=null){let s=e??"\u5728\u5EAB\u672A\u78BA\u8A8D";return n`<span class="inline-flex flex-wrap items-center gap-x-1 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s==="\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09"?"bg-emerald-50 text-emerald-700 ring-emerald-200":s==="\u8981\u518D\u78BA\u8A8D"?"bg-orange-100 text-orange-800 ring-orange-300":s==="\u5728\u5EAB\u306A\u3057\uFF08\u78BA\u8A8D\u6E08\uFF09"?"bg-slate-100 text-slate-600 ring-slate-200":"bg-amber-50 text-amber-800 ring-amber-200"}" title="${s==="\u8981\u518D\u78BA\u8A8D"?"\u5728\u5EAB\u3042\u308A\u3068\u78BA\u8A8D\u3057\u3066\u304B\u3089\u65E5\u6570\u304C\u7D4C\u3063\u3066\u3044\u307E\u3059\u3002\u58F2\u308C\u3066\u3044\u308B\u53EF\u80FD\u6027\u304C\u3042\u308B\u306E\u3067\u3001\u884C\u304F\u524D\u306B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044":""}" data-testid="stock-chip"><span class="whitespace-nowrap">${s}</span>${t!=null?n`<span class="whitespace-nowrap font-normal opacity-80">${be(t)}</span>`:""}</span>`}function $e(e){let t=e.premium;return t.listPrice==null?n`<div class="text-[11px] text-slate-400">定価 ${v}</div>`:n`<div class="text-[11px] ${t.buyAtOrBelowList?"text-slate-500":"text-red-600"}">定価 ${k(t.listPrice)}${t.buyAtOrBelowList?"":"\uFF08\u8D85\u3048\uFF09"}</div>`}function Q(e){let t=e.premium;return!t.overList||t.ratio==null?n``:t.bothOverList?n`<span class="inline-block rounded bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold leading-tight text-white" title="Amazon中古とフリマの売却済み価格の両方が定価を超えています" data-testid="premium-badge">両方で定価超え <span class="whitespace-nowrap">Amazon ${t.ratio.toFixed(2)}倍・フリマ ${t.fleaRatio.toFixed(2)}倍</span></span>`:n`<span class="inline-flex shrink-0 items-center whitespace-nowrap rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-700" title="Amazon中古の相場が定価を超えています" data-testid="premium-badge">プレミア 定価の${t.ratio.toFixed(2)}倍</span>`}var Y=()=>n`<span class="inline-flex shrink-0 items-center whitespace-nowrap rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700" title="架空のデモデータ">デモ</span>`;function we(e,t="h-14 w-14"){return e.product.imageUrl?n`<img src="${e.product.imageUrl}" alt="" loading="lazy" referrerpolicy="no-referrer" class="${t} shrink-0 rounded bg-slate-100 object-cover">`:n`<div class="${t} shrink-0 rounded bg-slate-100 text-[10px] leading-tight text-slate-400 grid place-items-center text-center">画像<br>未取得</div>`}function ne(e){if(!e.chosen)return n`<span class="text-slate-400">${v}</span>`;let t=["estimate","sold","listing"].filter(s=>e.latest[s]&&e.latest[s].id!==e.chosen.id);return n`<div class="font-semibold tabular-nums">${k(e.chosen.price)}</div>
    <div class="text-[11px] text-slate-500">${B[e.chosen.priceType]}${e.chosen.sampleCount!=null?` (n=${e.chosen.sampleCount})`:""}</div>
    ${t.map(s=>n`<div class="text-[11px] text-slate-400">${B[s]} ${k(e.latest[s].price)}</div>`)}
    <div class="text-[11px] tabular-nums ${_(e.profit?.profit)}">利益 ${I(e.profit?.profit)}</div>`}function ve(e,t){let s=ae(e,t),r=t??e.best,a=r&&s?M[r]:null;return n`<tr class="cursor-pointer border-b border-slate-100 hover:bg-amber-50/40 align-top" data-product="${e.product.id}" data-testid="item-row">
    <td class="p-2"><div class="flex gap-3">${we(e)}<div class="min-w-0">
      <div class="font-medium text-slate-900 line-clamp-2">${e.product.name}</div>
      <div class="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
        <span class="rounded bg-slate-100 px-1.5 py-0.5">${e.product.category}</span>
        <span>${e.product.jan?`JAN ${e.product.jan}`:e.product.isbn?`ISBN ${e.product.isbn}`:"JAN/ISBN \u672A\u53D6\u5F97"}</span>
        ${Q(e)}${e.isDemo?Y():""}
      </div></div></div></td>
    <td class="p-2 text-right whitespace-nowrap"><div class="font-semibold tabular-nums">${k(e.offer?.price)}</div>${$e(e)}<div class="text-[11px] text-slate-500">${e.offer?.condition??v}</div></td>
    <td class="p-2"><div class="text-sm">${e.store?.name??v}</div>
      <div class="text-[11px] text-slate-500">${e.store?`${e.store.prefecture}\u30FB${e.store.brandType}`:""}</div>
      <div class="mt-1">${j(e.stock.status,e.stock.ageDays)}</div></td>
    <td class="p-2 text-right whitespace-nowrap">${ne(e.markets.mercari)}</td>
    <td class="p-2 text-right whitespace-nowrap">${ne(e.markets.yahoo_fleamarket)}</td>
    <td class="p-2 text-right whitespace-nowrap">${ne(e.markets.amazon_used)}</td>
    <td class="p-2 text-right"><div class="text-base font-bold tabular-nums ${_(s?.profit)}" data-testid="profit">${I(s?.profit)}</div>
      <div class="whitespace-nowrap text-[11px] text-slate-500">${a?`${a}\u3067\u8CA9\u58F2`:""}</div></td>
    <td class="p-2 text-right"><div class="font-semibold tabular-nums ${_(s?.profit)}">${H(s?.marginPercent)}</div>
      <div class="text-[11px] text-slate-500">ROI ${H(s?.roiPercent)}</div></td>
    <td class="p-2 text-[11px] text-slate-500 whitespace-nowrap"><div>在庫 ${P(e.offer?.checkedAt)}</div><div>相場 ${P(e.latestMarketObservedAt)}</div></td>
  </tr>`}function ye(e,t){let s=ae(e,t),r=t??e.best,a=i=>{let l=e.markets[i];return n`<div class="rounded bg-slate-50 p-2"><div class="text-[11px] text-slate-500">${M[i]}相場</div>
      <div class="font-semibold tabular-nums">${l.chosen?k(l.chosen.price):v}</div>
      <div class="text-[11px] text-slate-500">${l.chosen?B[l.chosen.priceType]:""}</div>
      <div class="text-[11px] tabular-nums ${_(l.profit?.profit)}">利益 ${I(l.profit?.profit)}</div></div>`};return n`<article class="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:bg-slate-50" data-product="${e.product.id}" data-testid="item-card">
    <div class="flex gap-3">${we(e,"h-16 w-16")}<div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2"><h3 class="font-medium leading-snug line-clamp-2">${e.product.name}</h3>${e.isDemo?Y():""}</div>
      ${e.premium.overList?n`<div class="mt-1">${Q(e)}</div>`:""}
      <div class="mt-1 text-[11px] text-slate-500">${e.product.category}・${e.store?.name??`\u5E97\u8217${v}`}</div>
      <div class="mt-1">${j(e.stock.status,e.stock.ageDays)}</div></div></div>
    <div class="mt-3 flex items-end justify-between rounded-lg px-3 py-2 ${s==null?"bg-slate-50":s.profit>0?"bg-emerald-50":"bg-red-50"}">
      <div><div class="text-[11px] text-slate-500">想定利益${r&&s?`\uFF08${M[r]}\u3067\u8CA9\u58F2\uFF09`:""}</div>
        <div class="text-xl font-bold tabular-nums ${_(s?.profit)}" data-testid="profit">${I(s?.profit)}</div></div>
      <div class="text-right"><div class="text-[11px] text-slate-500">利益率</div><div class="font-semibold ${_(s?.profit)}">${H(s?.marginPercent)}</div></div>
    </div>
    <div class="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
      <div class="rounded bg-amber-50 p-2"><div class="text-[11px] text-slate-500">BOOKOFF価格</div><div class="font-semibold tabular-nums">${k(e.offer?.price)}</div>${$e(e)}</div>
      ${A.map(a)}
    </div>
    <div class="mt-1 text-[11px] text-slate-400">情報取得 ${P(e.updatedAt)}</div>
  </article>`}function De(e,t){let s=(r,a,i="text",l="")=>n`<label class="block"><span class="lbl">${a}</span>
    <input class="inp" name="${r}" type="${i}" value="${t[r]??""}" ${C(l)}></label>`;return n`<form id="filters" class="space-y-3" autocomplete="off">
    <label class="flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-sm font-semibold text-emerald-800">
      <input type="checkbox" name="profitOnly" value="1" class="h-4 w-4 accent-emerald-600" ${t.profitOnly!==!1?C("checked"):""}> 利益が出る商品のみ表示</label>
    <div class="space-y-1 rounded-lg bg-rose-50 p-2">
      <label class="flex items-center gap-2 text-sm font-semibold text-rose-800"><input type="checkbox" name="premiumOnly" value="1" class="h-4 w-4 accent-rose-600" ${t.premiumOnly?C("checked"):""}> Amazon中古が定価超え（プレミア）のみ</label>
      <label class="flex items-center gap-2 text-sm font-semibold text-rose-800"><input type="checkbox" name="bothOver" value="1" class="h-4 w-4 accent-rose-600" ${t.bothOver?C("checked"):""}> フリマの売却済み価格でも定価超え（両方）のみ</label>
      <label class="flex items-center gap-2 text-sm font-semibold text-rose-800"><input type="checkbox" name="belowList" value="1" class="h-4 w-4 accent-rose-600" ${t.belowList?C("checked"):""}> BOOKOFF価格が定価以下のみ</label>
      <p class="text-[11px] leading-snug text-rose-700">フリマ側はYahoo!フリマ・メルカリの売却済み価格のうち低い方で判定します。
        フリマ未確認の候補は<a class="font-semibold underline" href="#/check">確認待ち</a>へ。</p>
      <button type="button" id="premium-preset" class="mt-1 w-full rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700">プレミア商品を探す</button>
    </div>
    <label class="block"><span class="lbl">利益を判定する販路</span><select class="inp" name="marketplace">
      ${S([...A],t.marketplace,M,"\u6700\u3082\u5229\u76CA\u304C\u51FA\u308B\u8CA9\u8DEF")}</select></label>
    ${s("q","\u5546\u54C1\u540D","search",'placeholder="\u4F8B\uFF1A\u554F\u984C\u96C6"')}
    ${s("code","JAN\u30FBISBN","search",'inputmode="numeric" placeholder="\u4E00\u90E8\u3067\u3082\u53EF"')}
    <div class="grid grid-cols-2 gap-2">
      <label class="block"><span class="lbl">都道府県</span><select class="inp" name="prefecture">${S(e.prefectures,t.prefecture,void 0,"\u3059\u3079\u3066")}</select></label>
      <label class="block"><span class="lbl">店舗種別</span><select class="inp" name="brandType">
        <option value="">すべて</option>
        <option value="core" ${t.brandType==="core"?C("selected"):""}>総合（BOOKOFF系3業態）</option>
        <option value="related" ${t.brandType==="related"?C("selected"):""}>関連業態</option>
        ${S(e.brandTypes,t.brandType)}</select></label>
    </div>
    ${t.storeId!==void 0?n`<input type="hidden" name="storeId" value="${t.storeId}">
      <div class="flex items-center justify-between gap-2 rounded-lg bg-amber-50 p-2 text-sm" data-testid="store-chip">
        <span>店舗：<b id="store-chip-name">選択中の店舗</b></span>
        <button type="button" id="clear-store" class="rounded px-2 text-slate-500 hover:bg-amber-100" aria-label="店舗の指定を外す">✕</button></div>`:""}
    ${s("store","\u5E97\u8217\u540D","search",'list="store-names" placeholder="\u4F8B\uFF1A\u5BCC\u58EB\u5BAE"')}
    <datalist id="store-names"></datalist>
    <div class="grid grid-cols-2 gap-2">
      <label class="block"><span class="lbl">カテゴリ</span><select class="inp" name="category">${S(e.categories,t.category,void 0,"\u3059\u3079\u3066")}</select></label>
      <label class="block"><span class="lbl">在庫確認状態</span><select class="inp" name="stockStatus">${S(e.filterStockStatuses,t.stockStatus,void 0,"\u3059\u3079\u3066")}</select></label>
    </div>
    <div class="grid grid-cols-2 gap-2">
      ${s("minProfit","\u6700\u4F4E\u5229\u76CA\u984D\uFF08\u5186\uFF09","number",'inputmode="numeric" step="1"')}
      ${s("minMargin","\u6700\u4F4E\u5229\u76CA\u7387\uFF08%\uFF09","number",'inputmode="decimal" step="0.1"')}
    </div>
    <div><span class="lbl">仕入れ価格帯（円）</span><div class="grid grid-cols-2 gap-2">
      <input class="inp" name="priceMin" type="number" inputmode="numeric" placeholder="下限" value="${t.priceMin??""}" aria-label="仕入れ価格 下限">
      <input class="inp" name="priceMax" type="number" inputmode="numeric" placeholder="上限" value="${t.priceMax??""}" aria-label="仕入れ価格 上限"></div></div>
    <div class="grid grid-cols-2 gap-2">
      ${s("marketSince","\u76F8\u5834\u306E\u53D6\u5F97\u65E5\uFF08\u4EE5\u964D\uFF09","date")}
      <label class="block"><span class="lbl">データ種別</span><select class="inp" name="dataKind">
        ${S(["all","real","demo"],t.dataKind,{all:"\u3059\u3079\u3066",real:"\u5B9F\u30C7\u30FC\u30BF\u306E\u307F",demo:"\u30C7\u30E2\u306E\u307F"})}</select></label>
    </div>
    <div class="flex gap-2 pt-1"><button type="reset" class="btn-secondary flex-1" id="reset-filters">条件をクリア</button></div>
  </form>`}var z=new URLSearchParams,U=0;async function ke(e,t,s){let r=X(s);$(e,n`
    <div class="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-6">
      <aside class="mb-4 lg:mb-0">
        <details class="group rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-20" id="filter-panel" ${window.matchMedia("(min-width:1024px)").matches?C("open"):""}>
          <summary class="flex cursor-pointer list-none items-center justify-between font-semibold">
            <span>絞り込み</span><span class="text-xs text-slate-400 group-open:hidden">タップで開く</span></summary>
          <div class="mt-3">${De(t,r)}</div>
        </details>
      </aside>
      <section class="min-w-0">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <div class="text-sm text-slate-600" id="result-count" aria-live="polite">読み込み中…</div>
          <div class="ml-auto flex flex-wrap items-center gap-2">
            <label class="sr-only" for="sort">並び替え</label>
            <select id="sort" class="inp !w-auto">${S(Object.keys(he),r.sort,he)}</select>
            <button id="amazon-refresh" class="btn-secondary hidden" type="button" title="Keepa APIでAmazon中古価格を取得">Amazon中古価格を更新</button>
            <a id="export" class="btn-secondary" href="#">CSVエクスポート</a>
            <button id="add-product" class="btn-primary" type="button">＋ 手動登録</button>
          </div>
        </div>
        <div id="results"></div>
      </section>
    </div>`),x.stores().then(({stores:p})=>{let m=d("#store-names");m&&$(m,n`${p.map(h=>n`<option value="${h.name}"></option>`)}`);let b=d("#store-chip-name");b&&r.storeId!==void 0&&(b.textContent=p.find(h=>h.id===r.storeId)?.name??`\u5E97\u8217ID ${r.storeId}`)}).catch(()=>{});let a=d("#filters",e),i=d("#sort",e),l=()=>{let p=new URLSearchParams;return new FormData(a).forEach((m,b)=>{String(m).trim()!==""&&p.set(b,String(m))}),p.set("profitOnly",d("input[name=profitOnly]",a).checked?"1":"0"),p.set("premiumOnly",d("input[name=premiumOnly]",a).checked?"1":"0"),p.set("belowList",d("input[name=belowList]",a).checked?"1":"0"),p.set("bothOver",d("input[name=bothOver]",a).checked?"1":"0"),p.set("sort",i.value),X(p)},o=async()=>{let p=l();z=ue(p),p.dataKind==="all"&&z.delete("dataKind"),history.replaceState(null,"",`#/?${z}`),d("#export",e).href=`/api/export.csv?${z}`,await W(e)},c=pe(o,250);a.addEventListener("input",c),a.addEventListener("change",c),a.addEventListener("submit",p=>{p.preventDefault(),o()}),a.addEventListener("reset",()=>setTimeout(()=>{d("input[name=profitOnly]",a).checked=!0,o()},0)),i.addEventListener("change",o),d("#clear-store",e)?.addEventListener("click",()=>{d("input[name=storeId]",a)?.remove(),d("[data-testid=store-chip]",a)?.remove(),o()}),d("#premium-preset",e).addEventListener("click",()=>{d("input[name=premiumOnly]",a).checked=!0,d("input[name=belowList]",a).checked=!0,d("input[name=bothOver]",a).checked=!0,d("input[name=profitOnly]",a).checked=!0,d("select[name=marketplace]",a).value="amazon_used",i.value="premium_desc",o()}),d("#add-product",e).addEventListener("click",()=>xe(t,()=>W(e))),x.providers().then(({providers:p})=>{let m=p.find(h=>h.id==="amazon-used-keepa"),b=d("#amazon-refresh",e);!m?.configured||!b||(b.classList.remove("hidden"),b.addEventListener("click",async()=>{b.disabled=!0,b.textContent="\u53D6\u5F97\u4E2D\u2026";try{let h=await x.runBulk("amazon-used-keepa");f(`Amazon\u4E2D\u53E4\u4FA1\u683C\uFF1A${h.requested}\u4EF6\u3092\u7167\u4F1A\u3001${h.matched}\u4EF6\u53D6\u5F97\u3001${h.notFound}\u4EF6\u898B\u3064\u304B\u3089\u305A\u3001\u5B9A\u4FA1${h.listPricesSet}\u4EF6\u3092\u8A2D\u5B9A`),await W(e)}catch(h){f(h.message,"error")}b.disabled=!1,b.textContent="Amazon\u4E2D\u53E4\u4FA1\u683C\u3092\u66F4\u65B0"}))}).catch(()=>{}),d("#results",e).addEventListener("keydown",p=>{let m=p.target.closest("[data-product]");m&&(p.key==="Enter"||p.key===" ")&&(p.preventDefault(),K(Number(m.dataset.product),t,()=>W(e)))}),d("#results",e).addEventListener("click",p=>{let m=p.target.closest("[data-product]");m&&K(Number(m.dataset.product),t,()=>W(e))}),await o()}async function W(e){let t=d("#results",e);if(t){try{let{rows:s,matched:r,total:a}=await x.items(z);U=s.length;let i=X(z),l=i.marketplace,o=i.bothOver?`\u4E21\u65B9\u3067\u5B9A\u4FA1\u8D85\u3048\u306E\u5546\u54C1 ${r.toLocaleString()}\u4EF6`:i.premiumOnly?`\u30D7\u30EC\u30DF\u30A2\u5546\u54C1 ${r.toLocaleString()}\u4EF6`:i.profitOnly?`\u5229\u76CA\u304C\u51FA\u308B\u5546\u54C1 ${r.toLocaleString()}\u4EF6`:`${r.toLocaleString()}\u4EF6 \u8A72\u5F53`,c=()=>`${o}\uFF08\u5168${a.toLocaleString()}\u4EF6\uFF09${r>U?`\u30FB${U}\u4EF6\u3092\u8868\u793A\u4E2D`:""}`;if(d("#result-count",e).textContent=c(),s.length===0){$(t,n`<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        ${i.profitOnly?"\u6761\u4EF6\u306B\u5408\u3046\u3001\u5229\u76CA\u304C\u51FA\u308B\u5546\u54C1\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u300C\u5229\u76CA\u304C\u51FA\u308B\u5546\u54C1\u306E\u307F\u8868\u793A\u300D\u3092\u5916\u3059\u3068\u5168\u4EF6\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002":"\u6761\u4EF6\u306B\u5408\u3046\u5546\u54C1\u304C\u3042\u308A\u307E\u305B\u3093\u3002"}<br>
        <a class="text-sky-700 underline" href="#/import">CSVを取り込む</a>か、「＋ 手動登録」から追加してください。</div>`);return}$(t,n`
      <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full min-w-[1080px] text-sm" data-testid="items-table">
          <thead class="sticky top-0 bg-slate-50 text-left text-xs font-semibold text-slate-600">
            <tr><th class="p-2">商品名</th><th class="p-2 text-right whitespace-nowrap">BOOKOFF価格</th><th class="p-2">対象店舗</th>
              <th class="p-2 text-right whitespace-nowrap">メルカリ相場</th><th class="p-2 text-right whitespace-nowrap">Yahoo!フリマ相場</th>
              <th class="p-2 text-right whitespace-nowrap">Amazon中古相場</th>
              <th class="p-2 text-right">想定利益</th><th class="p-2 text-right">利益率</th><th class="p-2">情報取得日時</th></tr>
          </thead>
          <tbody>${s.map(p=>ve(p,l))}</tbody>
        </table>
      </div>
      <div class="grid gap-3 md:hidden" data-testid="items-cards">${s.map(p=>ye(p,l))}</div>
      ${r>s.length?n`<div class="mt-4 text-center"><button type="button" id="load-more" class="btn-secondary">さらに表示（残り ${r-s.length}件）</button></div>`:""}`),d("#load-more",t)?.addEventListener("click",async function(){let m=this;m.disabled=!0;try{let b=new URLSearchParams(z);b.set("offset",String(U));let h=await x.items(b),y=d("[data-testid=items-table] tbody",t),T=d("[data-testid=items-cards]",t);y.insertAdjacentHTML("beforeend",n`${h.rows.map(O=>ve(O,l))}`.value),T.insertAdjacentHTML("beforeend",n`${h.rows.map(O=>ye(O,l))}`.value),U+=h.rows.length,F("[data-product]",t).forEach(O=>O.setAttribute("tabindex","0")),d("#result-count",e).textContent=c(),U>=r?m.parentElement.remove():(m.textContent=`\u3055\u3089\u306B\u8868\u793A\uFF08\u6B8B\u308A ${r-U}\u4EF6\uFF09`,m.disabled=!1)}catch(b){f(b.message,"error"),m.disabled=!1}})}catch(s){f(`\u4E00\u89A7\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF1A${s.message}`,"error")}F("[data-product]",t).forEach(s=>s.setAttribute("tabindex","0"))}}var _e=e=>`https://jp.mercari.com/search?keyword=${encodeURIComponent(e)}`,Ne=e=>`https://paypayfleamarket.yahoo.co.jp/search/${encodeURIComponent(e)}`,He=()=>new Date(Date.now()+9*36e5).toISOString().slice(0,16);function Ke(e){let t=e.premium,s=e.product.name;return n`<article class="rounded-xl border border-slate-200 bg-white p-4" data-testid="check-card" data-product="${e.product.id}">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0"><h3 class="font-medium leading-snug">${e.product.name}</h3>
        <div class="mt-1 text-xs text-slate-500">${e.product.category}・${e.product.jan?`JAN ${e.product.jan}`:e.product.isbn?`ISBN ${e.product.isbn}`:"JAN/ISBN \u672A\u53D6\u5F97"}</div></div>
      ${e.isDemo?Y():""}
    </div>
    <div class="mt-2">${Q(e)}</div>
    <dl class="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
      <div class="rounded bg-slate-50 p-2"><dt class="text-[11px] text-slate-500">定価</dt><dd class="font-semibold tabular-nums">${k(t.listPrice)}</dd></div>
      <div class="rounded bg-slate-50 p-2"><dt class="text-[11px] text-slate-500">Amazon中古</dt><dd class="font-semibold tabular-nums">${k(t.amazonPrice)}</dd></div>
      <div class="rounded bg-amber-50 p-2"><dt class="text-[11px] text-slate-500">BOOKOFF</dt><dd class="font-semibold tabular-nums">${k(e.offer?.price)}</dd></div>
    </dl>
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>${e.store?.name??`\u5E97\u8217${v}`}</span>${j(e.stock.status,e.stock.ageDays)}</div>
    <div class="mt-3 flex flex-wrap gap-2">
      <a class="btn-secondary !py-1.5 text-xs" href="${_e(s)}" target="_blank" rel="noopener noreferrer">メルカリで探す ↗</a>
      <a class="btn-secondary !py-1.5 text-xs" href="${Ne(s)}" target="_blank" rel="noopener noreferrer">Yahoo!フリマで探す ↗</a>
    </div>
    <form class="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[auto_1fr_6rem_auto]" data-flea-form>
      <label><span class="lbl">販路</span><select class="inp" name="marketplace"><option value="yahoo_fleamarket">Yahoo!フリマ</option><option value="mercari">メルカリ</option></select></label>
      <label><span class="lbl">売れた価格（円）</span><input class="inp" name="price" type="number" min="1" required inputmode="numeric" placeholder="例：1800"></label>
      <label><span class="lbl">見た件数</span><input class="inp" name="sampleCount" type="number" min="1" inputmode="numeric" placeholder="例：5"></label>
      <div class="flex items-end"><button class="btn-primary w-full">登録</button></div>
    </form>
  </article>`}async function Se(e,t){let s=new URLSearchParams({needsFleaCheck:"1",profitOnly:"0",sort:"premium_desc",limit:"200"}),{rows:r}=await x.items(s);$(e,n`
    <div class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <div class="font-semibold">フリマで売れた価格の確認待ち：${r.length}件</div>
      <p class="mt-1">Amazon中古では定価を超えていて、BOOKOFFでは定価以下で買える商品のうち、フリマの売却済み価格がまだ無いものです。
      「メルカリで探す」「Yahoo!フリマで探す」で検索を開き、<b>「売り切れ」に絞り込んで</b>直近数件の真ん中くらいの価格を登録してください。
      登録すると、両方で定価を超えた商品は一覧の「プレミア商品を探す」に表示されます。</p>
    </div>
    ${r.length?n`<div class="grid gap-3 lg:grid-cols-2" id="check-list">${r.map(Ke)}</div>`:n`<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">確認待ちの商品はありません。
        <br>Amazon中古の価格と定価が入ると、ここに候補が出ます（データ取得元画面の「一括取得」かCSVで登録）。</div>`}`),F("[data-flea-form]",e).forEach(a=>a.addEventListener("submit",async i=>{i.preventDefault();let l=a.closest("[data-product]"),o=Number(l.dataset.product),c=new FormData(a),p=Number(c.get("price"));try{await x.addPrice({productId:o,marketplace:c.get("marketplace"),priceType:"sold",price:p,sampleCount:c.get("sampleCount")?Number(c.get("sampleCount")):null,observedAt:He(),note:"\u78BA\u8A8D\u5F85\u3061\u753B\u9762\u304B\u3089\u767B\u9332"});let b=(await x.items(new URLSearchParams({q:"",profitOnly:"0",bothOver:"1",limit:"2000"}))).rows.some(T=>T.product.id===o);f(b?"\u767B\u9332\u3057\u307E\u3057\u305F\uFF1A\u4E21\u65B9\u3067\u5B9A\u4FA1\u8D85\u3048\u3067\u3059\u3002\u30D7\u30EC\u30DF\u30A2\u5546\u54C1\u306E\u4E00\u89A7\u306B\u8868\u793A\u3055\u308C\u307E\u3059":"\u767B\u9332\u3057\u307E\u3057\u305F\uFF1A\u30D5\u30EA\u30DE\u3067\u306F\u5B9A\u4FA1\u4EE5\u4E0B\u3067\u3057\u305F\u3002\u5019\u88DC\u304B\u3089\u5916\u308C\u307E\u3059"),l.remove();let h=F("[data-testid=check-card]",e).length,y=d(".font-semibold",e);y&&(y.textContent=`\u30D5\u30EA\u30DE\u3067\u58F2\u308C\u305F\u4FA1\u683C\u306E\u78BA\u8A8D\u5F85\u3061\uFF1A${h}\u4EF6`)}catch(m){f(m.message,"error")}}))}function le(e){try{return{text:new TextDecoder("utf-8",{fatal:!0}).decode(e),encoding:"utf-8"}}catch{return{text:new TextDecoder("shift_jis").decode(e),encoding:"shift_jis"}}}var q=(e,t,s="")=>n`<section class="rounded-xl border border-slate-200 bg-white p-4 ${s}">
  <h2 class="mb-3 font-semibold">${e}</h2>${t}</section>`,Ee=e=>e==="\u55B6\u696D\u4E2D"?"bg-emerald-50 text-emerald-700":e==="\u9589\u5E97"?"bg-slate-200 text-slate-600":"bg-amber-50 text-amber-800";async function Te(e,t){let[{stores:s},{summary:r}]=await Promise.all([x.stores(),x.storeSummary()]),a=new Map(r.map(c=>[c.storeId,c])),i=t.prefectures.map(c=>({p:c,n:s.filter(p=>p.prefecture===c).length}));$(e,n`
    <div class="mb-3 grid grid-cols-3 gap-2 sm:gap-3">${i.map(({p:c,n:p})=>n`<button type="button" data-pref="${c}" class="rounded-xl border border-slate-200 bg-white p-2 text-left hover:border-amber-400 sm:p-3">
      <div class="text-xs text-slate-500">${c}</div><div class="text-xl font-bold sm:text-2xl">${p}<span class="text-xs font-normal text-slate-500 sm:text-sm"> 店舗</span></div>
      <div class="text-[11px] text-emerald-700">利益商品のある店舗 ${s.filter(m=>m.prefecture===c&&(a.get(m.id)?.profitable??0)>0).length}</div></button>`)}</div>
    <p class="mb-3 text-xs text-slate-500">県を選ぶと、利益が出る商品のある店舗を想定利益の多い順に並べます。店舗をタップするとその店舗の商品一覧を開きます。
      <span class="hidden sm:inline">初期データ：${t.storeSeed.source}（確認 ${P(t.storeSeed.verifiedAt)}）。閉店・移転・改称は「取込・出力」の店舗CSVで更新できます。</span></p>
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <select id="st-pref" class="inp !w-auto" aria-label="都道府県">${S(t.prefectures,void 0,void 0,"\u3059\u3079\u3066\u306E\u90FD\u9053\u5E9C\u770C")}</select>
      <select id="st-sort" class="inp !w-auto" aria-label="並び替え">${S(["profit","count","premium","official"],"profit",{profit:"\u60F3\u5B9A\u5229\u76CA\u5408\u8A08\u304C\u591A\u3044\u9806\uFF08\u5728\u5EAB\u78BA\u8A8D\u6E08\uFF09",count:"\u5229\u76CA\u5546\u54C1\u304C\u591A\u3044\u9806",premium:"\u4E21\u65B9\u3067\u5B9A\u4FA1\u8D85\u3048\u304C\u591A\u3044\u9806",official:"\u516C\u5F0F\u4E00\u89A7\u306E\u9806"})}</select>
      <label class="flex items-center gap-1.5 text-sm"><input id="st-only" type="checkbox" class="h-4 w-4 accent-emerald-600" checked> 利益商品がある店舗のみ</label>
      <input id="st-q" class="inp !w-48" type="search" placeholder="店舗名・住所で検索" aria-label="店舗検索">
      <select id="st-brand" class="inp !w-auto" aria-label="店舗種別">${S(t.brandTypes,void 0,void 0,"\u3059\u3079\u3066\u306E\u7A2E\u5225")}</select>
      <select id="st-status" class="inp !w-auto" aria-label="状態">${S(t.storeStatuses,void 0,void 0,"\u3059\u3079\u3066\u306E\u72B6\u614B")}</select>
      <span id="st-count" class="text-sm text-slate-500"></span>
    </div>
    <div id="st-list"></div>`);let l=c=>a.get(c)??{storeId:c,profitable:0,profitableInStock:0,profitableUnconfirmed:0,profitableStale:0,premiumBoth:0,profitSumInStock:0,lastCheckedAt:null},o=()=>{let c=d("#st-q").value.trim(),p=d("#st-pref").value,m=d("#st-brand").value,b=d("#st-status").value,h=d("#st-only").checked,y=d("#st-sort").value,T=s.filter(E=>(!c||E.name.includes(c)||E.address.includes(c))&&(!p||E.prefecture===p)&&(!m||E.brandType===m)&&(!b||E.status===b)&&(!h||l(E.id).profitable>0)),O=E=>{let u=l(E.id);return y==="profit"?u.profitSumInStock:y==="count"?u.profitable:y==="premium"?u.premiumBoth:0};if(y!=="official"&&T.sort((E,u)=>O(u)-O(E)||l(u.id).profitable-l(E.id).profitable||E.id-u.id),d("#st-count").textContent=`${T.length}\u5E97\u8217`,!T.length){$(d("#st-list"),n`<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500" data-testid="stores-empty">
        条件に合う店舗はありません。${h?"\u300C\u5229\u76CA\u5546\u54C1\u304C\u3042\u308B\u5E97\u8217\u306E\u307F\u300D\u3092\u5916\u3059\u3068\u5168\u5E97\u8217\u3092\u8868\u793A\u3057\u307E\u3059\u3002":""}</div>`);return}$(d("#st-list"),n`
      <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white"><table class="w-full min-w-[980px] text-sm" data-testid="stores-table">
        <thead class="bg-slate-50 text-left text-xs text-slate-600"><tr><th class="p-2">店舗名</th><th class="p-2">所在地</th><th class="p-2">状態</th>
          <th class="p-2 text-right">利益商品<br><span class="font-normal">在庫確認済／全件</span></th><th class="p-2 text-right">両方で<br>定価超え</th>
          <th class="p-2 text-right">想定利益合計<br><span class="font-normal">在庫確認済</span></th><th class="p-2">最終在庫確認</th><th class="p-2"></th></tr></thead>
        <tbody>${T.map(E=>je(E,l(E.id)))}</tbody></table></div>
      <div class="grid gap-2 md:hidden" data-testid="stores-cards">${T.map(E=>Ye(E,l(E.id)))}</div>`)};F("#st-q, #st-pref, #st-brand, #st-status, #st-only, #st-sort",e).forEach(c=>c.addEventListener("input",o)),F("[data-pref]",e).forEach(c=>c.addEventListener("click",()=>{d("#st-pref").value=c.dataset.pref,o(),d("#st-list")?.scrollIntoView({behavior:"smooth",block:"start"})})),e.addEventListener("click",async c=>{let p=c.target;if(p.closest("a"))return;let m=p.closest("[data-store-info]");if(m)return c.stopPropagation(),Ue(s,Number(m.dataset.storeInfo));let b=p.closest("[data-store]");b&&(location.hash=`#/?storeId=${b.dataset.store}&profitOnly=0`)}),o()}async function Ue(e,t){let s=e.find(a=>a.id===t),{events:r}=await x.storeEvents(s.id);Z(s.name,n`<dl class="grid grid-cols-[7rem_1fr] gap-1 text-sm">
    <dt class="text-slate-500">公式店舗ID</dt><dd>${s.officialId??v}</dd><dt class="text-slate-500">店舗種別</dt><dd>${s.brandType}（${te[s.brandGroup]}）</dd>
    <dt class="text-slate-500">所在地</dt><dd>${s.address}</dd><dt class="text-slate-500">状態</dt><dd>${s.status}</dd>
    <dt class="text-slate-500">後継店舗</dt><dd>${s.successorStoreId?e.find(a=>a.id===s.successorStoreId)?.name??v:"\u306A\u3057"}</dd>
    <dt class="text-slate-500">確認日時</dt><dd>${P(s.verifiedAt)}</dd>
    <dt class="text-slate-500">備考</dt><dd>${s.note??"\u306A\u3057"}</dd><dt class="text-slate-500">取得元</dt><dd class="text-xs">${s.source}</dd></dl>
    <h3 class="mt-4 mb-1 font-semibold">変更履歴</h3><ul class="text-sm">${r.map(a=>n`<li class="border-t border-slate-100 py-1">
      <span class="text-xs text-slate-500">${P(a.occurredAt)}</span> ${{open:"\u767B\u9332",close:"\u9589\u5E97",move:"\u79FB\u8EE2",rename:"\u6539\u79F0",verify:"\u78BA\u8A8D",update:"\u66F4\u65B0"}[a.eventType]}
      <span class="text-xs text-slate-500">${a.after?JSON.stringify(a.after):""}</span></li>`)}</ul>`)}var ze=e=>e.officialUrl?n`<a class="text-xs text-sky-700 underline" href="${e.officialUrl}" target="_blank" rel="noopener noreferrer">公式ページ</a>`:"",Le=e=>n`<button type="button" class="text-xs text-slate-500 underline" data-store-info="${e.id}">店舗情報</button>`;function je(e,t){return n`<tr class="cursor-pointer border-t border-slate-100 hover:bg-amber-50/40" data-store="${e.id}" data-testid="store-row">
    <td class="p-2"><div class="font-medium">${e.name}</div><div class="text-[11px] text-slate-500">${e.brandType}（${te[e.brandGroup]}）</div></td>
    <td class="p-2 text-xs">${e.address}</td>
    <td class="p-2"><span class="rounded px-1.5 py-0.5 text-[11px] ${Ee(e.status)}">${e.status}</span></td>
    <td class="p-2 text-right tabular-nums"><b class="${t.profitableInStock?"text-emerald-700":"text-slate-400"}">${t.profitableInStock}</b> ／ ${t.profitable}
      ${t.profitableStale?n`<div class="text-[11px] font-semibold text-orange-700" data-testid="store-stale">要再確認 ${t.profitableStale}</div>`:""}
      ${t.profitableUnconfirmed?n`<div class="text-[11px] text-amber-700">未確認 ${t.profitableUnconfirmed}</div>`:""}</td>
    <td class="p-2 text-right tabular-nums ${t.premiumBoth?"font-bold text-rose-700":"text-slate-400"}">${t.premiumBoth}</td>
    <td class="p-2 text-right font-semibold tabular-nums ${t.profitSumInStock>0?"text-emerald-600":"text-slate-400"}" data-testid="store-profit">${t.profitSumInStock>0?I(t.profitSumInStock):"\xA50"}</td>
    <td class="p-2 text-xs text-slate-500 whitespace-nowrap">${P(t.lastCheckedAt)}</td>
    <td class="p-2 whitespace-nowrap"><span class="text-xs font-semibold text-sky-700">商品を見る →</span><div class="mt-1 flex gap-2">${Le(e)}${ze(e)}</div></td></tr>`}function Ye(e,t){return n`<div class="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50" data-store="${e.id}" data-testid="store-card">
    <div class="flex items-start justify-between gap-2"><div class="font-medium">${e.name}</div>
      <span class="rounded px-1.5 py-0.5 text-[11px] ${Ee(e.status)}">${e.status}</span></div>
    <div class="text-xs text-slate-500">${e.address}</div>
    <div class="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
      <div class="rounded bg-emerald-50 p-2"><div class="text-[11px] text-slate-500">利益商品</div><div class="font-bold tabular-nums">${t.profitableInStock}<span class="text-xs font-normal text-slate-500">／${t.profitable}</span></div><div class="text-[10px] text-slate-500">確認済／全件</div>${t.profitableStale?n`<div class="text-[10px] font-semibold text-orange-700">要再確認 ${t.profitableStale}</div>`:""}</div>
      <div class="rounded bg-rose-50 p-2"><div class="text-[11px] text-slate-500">両方定価超え</div><div class="font-bold tabular-nums">${t.premiumBoth}</div></div>
      <div class="rounded bg-slate-50 p-2"><div class="text-[11px] text-slate-500">想定利益合計</div><div class="font-bold tabular-nums ${t.profitSumInStock>0?"text-emerald-600":"text-slate-400"}">${t.profitSumInStock>0?I(t.profitSumInStock):"\xA50"}</div></div>
    </div>
    <div class="mt-2 flex items-center justify-between text-xs"><span class="text-slate-400">最終在庫確認 ${P(t.lastCheckedAt)}</span>
      <span class="flex gap-3">${Le(e)}<span class="font-semibold text-sky-700">商品を見る →</span></span></div></div>`}var qe=[{kind:"products",title:"BOOKOFF \u5546\u54C1\u30FB\u5728\u5EAB\u30FB\u4FA1\u683C",desc:n`列：商品名, JAN, ISBN, カテゴリ, 定価, 画像URL, 店舗ID（shop番号）または店舗名, BOOKOFF価格, 在庫状態, 商品状態, 在庫確認日時, 情報取得元。<br>在庫確認日時が空の行は「在庫未確認」として登録します。`},{kind:"market",title:"\u8CA9\u58F2\u76F8\u5834\uFF08\u30E1\u30EB\u30AB\u30EA\u30FBYahoo!\u30D5\u30EA\u30DE\u30FBAmazon\u4E2D\u53E4\uFF09",desc:n`列：商品名, JAN, ISBN, 販路（メルカリ／Yahoo!フリマ／Amazon中古）, 価格種別（出品価格／売却済み価格／推定相場）, 価格, サンプル数, 取得日時, 情報取得元, 備考。<br>Yahoo!オークション・Yahoo!ショッピングの行は拒否します。`},{kind:"stores",title:"\u5E97\u8217\u30DE\u30B9\u30BF\uFF08\u9589\u5E97\u30FB\u79FB\u8EE2\u30FB\u6539\u79F0\u306E\u53CD\u6620\uFF09",desc:n`列：公式店舗ID, 店舗名, 都道府県, 所在地, 店舗種別, 公式URL, 状態（営業中／閉店／移転／改称／要確認）, 後継店舗ID, 確認日時, 備考。<br>静岡県・山梨県・神奈川県以外は拒否します。`}];function Ge(e,t){return n`<div class="mt-3 rounded-lg ${e.errors.length?"bg-amber-50":"bg-emerald-50"} p-3 text-sm" data-testid="import-result">
    <div>${e.total}行を処理（${t}）：追加 <b>${e.inserted}</b>・更新 <b>${e.updated}</b>・スキップ <b>${e.skipped}</b>・エラー <b>${e.errors.length}</b></div>
    ${e.estimates?n`<div class="mt-1 text-xs text-slate-600" data-testid="import-estimates">売却済み価格から推定相場を自動算出：${e.estimates.saved}件（直近${e.estimates.days}日の中央値）</div>`:""}
    ${e.errors.length?n`<ul class="mt-2 max-h-48 list-disc overflow-auto pl-5 text-xs text-red-700">${e.errors.map(s=>n`<li>${s.line}行目：${s.message}</li>`)}</ul>`:""}</div>`}function Ve(e){let t=e.result,s=r=>r?Object.entries(r).filter(([,a])=>a!=null).map(([a,i])=>`${{name:"\u5E97\u8217\u540D",address:"\u6240\u5728\u5730",status:"\u72B6\u614B"}[a]??a}\uFF1A${i}`).join("\u3001"):"";return n`<div class="mt-2 rounded-lg border border-slate-200 bg-white p-3" data-testid="store-diff">
    <div class="text-sm">${t.total}行を照合：追加 <b>${e.changes.filter(r=>r.action==="inserted").length}</b>・変更 <b>${e.changes.filter(r=>r.action==="updated").length}</b>・変更なし ${t.skipped-t.errors.length}・エラー ${t.errors.length}・<span class="text-orange-700">CSVに無い営業中の店舗 <b>${e.missing.length}</b></span>（まだ保存していません）</div>
    ${e.changes.length?n`<ul class="mt-2 max-h-48 list-disc overflow-auto pl-5 text-xs">${e.changes.map(r=>n`<li>${r.line}行目 ${r.action==="inserted"?"\u3010\u8FFD\u52A0\u3011":"\u3010\u5909\u66F4\u3011"}${r.officialId??""} ${r.name}${r.action==="updated"?n`：${s(r.before)} → ${s(r.after)}`:""}</li>`)}</ul>`:""}
    ${e.missing.length?n`<div class="mt-2 text-xs font-semibold text-orange-700">CSVに無い店舗（閉店なら「状態」を閉店にした行をCSVに加えて取り込む）</div>
      <ul class="max-h-48 list-disc overflow-auto pl-5 text-xs" data-testid="store-diff-missing">${e.missing.map(r=>n`<li>${r.officialId??""} ${r.name}（${r.prefecture}）</li>`)}</ul>`:""}
    ${t.errors.length?n`<ul class="mt-2 list-disc pl-5 text-xs text-red-700">${t.errors.map(r=>n`<li>${r.line}行目：${r.message}</li>`)}</ul>`:""}</div>`}function Je(e){return e.length?n`<div class="space-y-3">${e.map(t=>{let s=[...t.products].sort((r,a)=>a.offers+a.prices-(r.offers+r.prices)||r.createdAt.localeCompare(a.createdAt));return n`<div class="rounded-lg border border-slate-200 p-3 text-sm" data-testid="dup-group">
      <div class="mb-1 text-xs text-slate-500">コード ${t.code}${t.isDemo?"\uFF08\u30C7\u30E2\uFF09":""}</div>
      <ul class="space-y-1">${s.map(r=>n`<li class="flex flex-wrap items-center gap-2">
        <button type="button" class="text-left underline" data-detail="${r.id}">ID ${r.id}：${r.name}</button><span class="text-xs text-slate-500">在庫${r.offers}・相場${r.prices}</span>
        <button class="btn-secondary !py-0.5 text-xs" data-merge="${r.id}" data-others="${s.filter(a=>a.id!==r.id).map(a=>a.id).join(",")}">この商品に統合</button></li>`)}</ul></div>`})}</div>`:n`<p class="text-sm text-emerald-700" data-testid="dups-empty">重複している商品はありません。</p>`}function ie(e,t,s){$(e,n`<div class="grid gap-4 lg:grid-cols-2">
    ${qe.map(a=>q(a.title,n`<p class="text-xs leading-relaxed text-slate-600">${a.desc}</p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <input type="file" accept=".csv,text/csv" data-import="${a.kind}" class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white" aria-label="${a.title} CSVファイル">
        <a class="text-sm text-sky-700 underline" href="/api/templates/${a.kind}.csv">テンプレートCSV</a></div>
      ${a.kind==="stores"?n`<div class="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <b>定期見直し：</b>公式の店舗一覧から作ったCSVを「差分だけ確認」で照合すると、保存せずに追加・変更される店舗と、CSVに無い営業中の店舗（閉店・改称の候補）を表示します。確認してから上の欄で取り込んでください。
        <label class="mt-2 block"><span class="lbl">差分だけ確認（保存しません）</span>
        <input type="file" accept=".csv,text/csv" id="store-diff" class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-600 file:px-3 file:py-2 file:text-white" aria-label="店舗マスタ 差分確認CSVファイル"></label>
        <div id="store-diff-result"></div></div>`:""}
      <div data-result="${a.kind}"></div>`))}
    ${q("\u91CD\u8907\u5546\u54C1\u306E\u7D71\u5408",n`<p class="text-sm text-slate-600">JAN・ISBNが同じ商品（書籍はISBN-13とJANを同一視、ISBN-10も変換して比較）を表示します。統合すると在庫・相場を1つの商品にまとめ、空欄の項目を補います。同じ店舗の在庫は確認日時が新しい方を残します。</p>
      <div class="mt-3" id="dups" data-testid="dups"></div>`)}
    ${q("CSV\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8",n`<p class="text-sm text-slate-600">一覧画面の現在の絞り込み条件で出力するには、一覧の「CSVエクスポート」を使います。ここからは全件を出力します（Excelで開けるBOM付きUTF-8）。</p>
      <div class="mt-3 flex flex-wrap gap-2"><a class="btn-secondary" href="/api/export.csv">全件をCSVで出力</a>
      <a class="btn-secondary" href="/api/export.csv?dataKind=real">実データのみ出力</a></div>`)}
    ${q("\u30C7\u30E2\u30C7\u30FC\u30BF",n`<p class="text-sm text-slate-600">現在のデモ：商品 ${t.counts.demo.products}件・在庫 ${t.counts.demo.offers}件・相場 ${t.counts.demo.prices}件。デモは架空の価格で、一覧では「デモ」バッジが付きます。</p>
      <div class="mt-3 flex gap-2"><button class="btn-secondary" id="demo-add">デモを投入</button><button class="btn-danger" id="demo-del">デモを全削除</button></div>`)}
  </div>`),F("[data-import]",e).forEach(a=>a.addEventListener("change",async()=>{let i=a.files?.[0];if(!i)return;let l=a.dataset.import,{text:o,encoding:c}=le(new Uint8Array(await i.arrayBuffer()));try{let p=await x.importCsv(l,o,i.name);$(d(`[data-result="${l}"]`,e),Ge(p,c==="utf-8"?"UTF-8":"Shift_JIS")),f("\u53D6\u308A\u8FBC\u307F\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F"),s()}catch(p){f(p.message,"error")}a.value=""})),d("#store-diff",e).addEventListener("change",async a=>{let i=a.target,l=i.files?.[0];if(!l)return;let{text:o}=le(new Uint8Array(await l.arrayBuffer()));try{$(d("#store-diff-result",e),Ve(await x.diffStores(o,l.name)))}catch(c){f(c.message,"error")}i.value=""});let r=async()=>{let a=d("#dups",e),{groups:i}=await x.duplicates();$(a,Je(i))};d("#dups",e).addEventListener("click",async a=>{let i=a.target.closest("[data-detail]");if(i){K(Number(i.dataset.detail),t,()=>{r()});return}let l=a.target.closest("[data-merge]");if(!l)return;let o=Number(l.dataset.merge),c=(l.dataset.others??"").split(",").map(Number).filter(Boolean);if(confirm(`\u5546\u54C1ID ${c.join("\u30FB")} \u3092 ID ${o} \u306B\u7D71\u5408\u3057\u307E\u3059\u3002\u5143\u306B\u623B\u305B\u307E\u305B\u3093\u3002\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F`))try{await x.mergeProducts(o,c),f("\u7D71\u5408\u3057\u307E\u3057\u305F"),s(),await r()}catch(p){f(p.message,"error")}}),r().catch(a=>f(a.message,"error")),d("#demo-add",e).addEventListener("click",async()=>{await x.seedDemo(),f("\u30C7\u30E2\u30C7\u30FC\u30BF\u3092\u6295\u5165\u3057\u307E\u3057\u305F"),s(!0)}),d("#demo-del",e).addEventListener("click",async()=>{confirm("\u30C7\u30E2\u30C7\u30FC\u30BF\uFF08\u67B6\u7A7A\u306E\u5546\u54C1\u30FB\u5728\u5EAB\u30FB\u76F8\u5834\uFF09\u3092\u3059\u3079\u3066\u524A\u9664\u3057\u307E\u3059\u3002\u5B9F\u30C7\u30FC\u30BF\u306F\u524A\u9664\u3055\u308C\u307E\u305B\u3093\u3002\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F")&&(await x.deleteDemo(),f("\u30C7\u30E2\u30C7\u30FC\u30BF\u3092\u524A\u9664\u3057\u307E\u3057\u305F"),s(!0))})}async function Oe(e){let t=await x.settings(),s=o=>n`<fieldset class="rounded-lg border border-slate-200 p-3"><legend class="px-1 font-semibold">${M[o]}</legend>
    <div class="grid grid-cols-2 gap-2">
      <label><span class="lbl">販売手数料率（%）</span><input class="inp" name="${o}.fee" type="number" min="0" max="100" step="0.01" required value="${t.marketplaces[o].feeRatePercent}"></label>
      <label><span class="lbl">送料（円）</span><input class="inp" name="${o}.ship" type="number" min="0" step="1" required value="${t.marketplaces[o].shipping}"></label>
    </div>
    ${o==="amazon_used"?n`<details class="mt-3" open><summary class="cursor-pointer text-sm font-medium">カテゴリー別の手数料（空欄＝基本料率）</summary>
      <div class="mt-2 overflow-x-auto"><table class="w-full text-sm"><thead class="text-left text-xs text-slate-500"><tr><th class="p-1">カテゴリー</th><th class="p-1">料率%</th><th class="p-1">成約料（円）</th><th class="p-1">最低手数料（円）</th></tr></thead>
      <tbody>${se.map(c=>{let p=t.marketplaces.amazon_used.categoryFees?.[c]??{};return n`<tr><td class="p-1 whitespace-nowrap">${c}</td>
        <td class="p-1"><input class="inp !py-1" name="amz.${c}.rate" type="number" min="0" max="100" step="0.1" value="${p.feeRatePercent??""}" aria-label="${c} 料率"></td>
        <td class="p-1"><input class="inp !py-1" name="amz.${c}.fixed" type="number" min="0" step="1" value="${p.fixedFee??""}" aria-label="${c} 成約料"></td>
        <td class="p-1"><input class="inp !py-1" name="amz.${c}.min" type="number" min="0" step="1" value="${p.minFee??""}" aria-label="${c} 最低手数料"></td></tr>`})}</tbody></table></div>
      <p class="mt-1 text-xs text-slate-500">初期値：メディア（本・CD・DVD）15%・最低手数料なし＋成約料（本80円、CD・DVD140円）。その他は保守的に15%・最低30円（家電は実際8〜10%のことが多いので要調整）。</p></details>`:""}
    </fieldset>`,r=o=>n`<select class="inp" name="prio${o}" aria-label="優先順位${o+1}">${S(["estimate","sold","listing"],t.priceTypePriority[o],B,o===0?void 0:"\uFF08\u4F7F\u308F\u306A\u3044\uFF09")}</select>`;$(e,n`<form id="settings-form" class="grid gap-4 lg:grid-cols-2">
    ${q("\u8CA9\u8DEF\u5225\u306E\u624B\u6570\u6599\u30FB\u9001\u6599",n`<div class="space-y-3">${A.map(s)}</div>
      <p class="mt-2 text-xs text-slate-500">初期値はメルカリ10%・Yahoo!フリマ5%・Amazon中古15%（2026年11月時点の公開情報）。送料は自己発送の想定値です。FBAを使う場合は配送代行手数料を送料に入れてください。</p>`)}
    ${q("\u5171\u901A\u8CBB\u7528\u30FB\u8A08\u7B97\u65B9\u6CD5",n`<div class="space-y-3">
      <label class="block"><span class="lbl">その他費用（円／1点）</span><input class="inp" name="other" type="number" min="0" step="1" value="${t.otherCost}"></label>
      <div><span class="lbl">想定販売価格に使う相場の優先順位</span><div class="grid grid-cols-3 gap-2">${r(0)}${r(1)}${r(2)}</div></div>
      <label class="block"><span class="lbl">在庫確認の有効日数（これを過ぎた「在庫あり」は「要再確認」。0で無効）</span>
        <input class="inp" name="stockFreshDays" type="number" min="0" max="365" step="1" value="${t.stockFreshDays}"></label>
      <label class="block"><span class="lbl">推定相場の自動算出：売却済み価格の期間（直近N日の中央値。0で自動算出しない）</span>
        <input class="inp" name="estimateDays" type="number" min="0" max="3650" step="1" value="${t.estimateDays}"></label>
      <label class="block"><span class="lbl">手数料の端数処理</span><select class="inp" name="rounding">${S(["floor","round","ceil"],t.rounding,{floor:"\u5207\u308A\u6368\u3066",round:"\u56DB\u6368\u4E94\u5165",ceil:"\u5207\u308A\u4E0A\u3052"})}</select></label>
      <div class="rounded-lg bg-slate-50 p-3 text-sm" id="preview"></div>
      <button class="btn-primary w-full">設定を保存</button>
      <button type="button" class="btn-secondary w-full" id="recompute">推定相場を今すぐ再計算</button></div>`)}
  </form>`);let a=d("#settings-form",e),i=()=>{let o=new FormData(a),c=y=>Number(o.get(y)),p=[0,1,2].map(y=>String(o.get(`prio${y}`)??"")).filter(Boolean),m=y=>{let T=String(o.get(y)??"").trim();return T===""?void 0:Number(T)},b={};for(let y of se){let T={feeRatePercent:m(`amz.${y}.rate`),fixedFee:m(`amz.${y}.fixed`),minFee:m(`amz.${y}.min`)};Object.keys(T).forEach(O=>T[O]===void 0&&delete T[O]),Object.keys(T).length&&(b[y]=T)}let h=y=>({...t.marketplaces[y],feeRatePercent:c(`${y}.fee`),shipping:c(`${y}.ship`)});return{marketplaces:{mercari:h("mercari"),yahoo_fleamarket:h("yahoo_fleamarket"),amazon_used:{...h("amazon_used"),categoryFees:b}},stockFreshDays:c("stockFreshDays"),estimateDays:c("estimateDays"),otherCost:c("other"),priceTypePriority:[...new Set(p)],rounding:o.get("rounding")}},l=()=>{let o=i(),c=p=>{let m=J(o.marketplaces[p],"\u672C"),b=re({salePrice:2e3,purchasePrice:500,...m,shipping:o.marketplaces[p].shipping,otherCost:o.otherCost,rounding:o.rounding});return n`<div>${M[p]}：手数料 ${k(b?.fee)}、利益 <b class="${(b?.profit??0)>=0?"text-emerald-600":"text-red-600"}">${k(b?.profit)}</b>（${b?.marginPercent??v}%）</div>`};$(d("#preview",e),n`<div class="mb-1 text-xs text-slate-500">計算例：本を¥500で仕入れ、¥2,000で販売</div>${A.map(c)}`)};a.addEventListener("input",l),d("#recompute",e).addEventListener("click",async()=>{try{let o=await x.recomputeEstimates();f(`\u63A8\u5B9A\u76F8\u5834\u3092${o.saved}\u4EF6\u7B97\u51FA\u3057\u307E\u3057\u305F\uFF08\u76F4\u8FD1${o.days}\u65E5\u306E\u58F2\u5374\u6E08\u307F\u4FA1\u683C\u306E\u4E2D\u592E\u5024\u30FB\u5B9F\u30C7\u30FC\u30BF\u306E\u307F\uFF09`)}catch(o){f(o.message,"error")}}),a.addEventListener("submit",async o=>{o.preventDefault();try{await x.saveSettings(i()),f("\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u5229\u76CA\u306F\u518D\u8A08\u7B97\u3055\u308C\u307E\u3059")}catch(c){f(c.message,"error")}}),l()}async function Pe(e){let{providers:t}=await x.providers(),s=(a,i,l)=>a==="implemented"&&l==="api"&&!i?n`<span class="whitespace-nowrap rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">実装済み・要APIキー</span>`:a==="implemented"?n`<span class="whitespace-nowrap rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">実装済み</span>`:n`<span class="whitespace-nowrap rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">未実装</span>`,r={csv:"CSV\u53D6\u8FBC",manual:"\u624B\u52D5\u767B\u9332",api:"\u81EA\u52D5\u53D6\u5F97",snapshot:"\u516C\u5F0F\u4E00\u89A7\u306E\u8A18\u9332"};$(e,n`
    <div class="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <b>自動取得について：</b>Amazon中古価格は Keepa API（有料）のAPIキーを設定すると自動取得できます（本番APIでの動作確認は未実施）。メルカリ・Yahoo!フリマ・BOOKOFF店舗在庫の自動取得は<b>未実装</b>です。公式に利用できるAPIが確認できず、規約に反するスクレイピングや認証・アクセス制限の回避は行わないためです。これらはCSV取込または手動登録で入力してください。
    </div>
    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table class="w-full text-sm" data-testid="providers-table">
      <thead class="bg-slate-50 text-left text-xs text-slate-600"><tr><th class="p-2">取得元</th><th class="p-2">方式</th><th class="p-2">状態</th><th class="p-2">補足</th><th class="p-2"></th></tr></thead>
      <tbody>${t.map(a=>n`<tr class="border-t border-slate-100 align-top"><td class="p-2 font-medium">${a.label}</td><td class="p-2">${r[a.method]}</td>
        <td class="p-2">${s(a.status,a.configured,a.method)}</td><td class="p-2 text-xs text-slate-600">${a.reason??""}</td>
        <td class="p-2">${a.bulk&&a.configured?n`<button class="btn-primary whitespace-nowrap !py-1 text-xs" data-bulk="${a.id}">一括取得</button>`:a.method==="api"&&a.status==="not_implemented"?n`<button class="btn-secondary whitespace-nowrap !py-1 text-xs" data-run="${a.id}">取得を試す</button>`:""}</td></tr>`)}</tbody></table></div>
    <div class="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div class="mb-1 font-semibold">Amazon中古価格を自動取得する設定</div>
      <ol class="list-decimal space-y-1 pl-5 text-slate-700"><li>Keepa（keepa.com）でAPIの有料プランに登録し、APIキーを取得する</li>
      <li>起動時に環境変数を付ける：<code class="rounded bg-slate-100 px-1">KEEPA_API_KEY=取得したキー npm start</code></li>
      <li>一覧の「Amazon中古価格を更新」またはこの画面の「一括取得」を押す（JAN/ISBNのある実データ商品が対象）</li></ol>
      <p class="mt-2 text-xs text-slate-500">APIキーは画面やDBには保存せず、サーバーの環境変数だけで扱います。</p></div>
    <p class="mt-3 text-xs text-slate-500">詳しい調査結果は docs/data-sources.md を参照。Providerを実装すると、この画面の状態が自動で切り替わります。</p>`),e.addEventListener("click",async a=>{let i=a.target.closest("[data-bulk]");if(i){i.disabled=!0;try{let o=await x.runBulk(i.dataset.bulk);f(`${o.requested}\u4EF6\u3092\u7167\u4F1A\u3001${o.matched}\u4EF6\u53D6\u5F97\u3001\u76F8\u5834${o.inserted}\u4EF6\u30FB\u5B9A\u4FA1${o.listPricesSet}\u4EF6\u3092\u4FDD\u5B58`)}catch(o){f(o.message,"error")}i.disabled=!1;return}let l=a.target.closest("[data-run]");if(l)try{await x.runProvider(l.dataset.run),f("\u53D6\u5F97\u3057\u307E\u3057\u305F")}catch(o){f(o.message,"error")}})}var oe=[{path:"/",label:"\u5229\u76CA\u5546\u54C1\u4E00\u89A7",short:"\u4E00\u89A7"},{path:"/check",label:"\u78BA\u8A8D\u5F85\u3061",short:"\u78BA\u8A8D\u5F85\u3061"},{path:"/stores",label:"\u5E97\u8217\u30DE\u30B9\u30BF",short:"\u5E97\u8217"},{path:"/import",label:"\u53D6\u8FBC\u30FB\u51FA\u529B",short:"\u53D6\u8FBC"},{path:"/settings",label:"\u8A2D\u5B9A",short:"\u8A2D\u5B9A"},{path:"/sources",label:"\u30C7\u30FC\u30BF\u53D6\u5F97\u5143",short:"\u53D6\u5F97\u5143"}],N;function ce(){let e=location.hash.replace(/^#/,"")||"/",[t,s]=e.split("?");return{path:t||"/",query:new URLSearchParams(s??"")}}function Ze(){$(document.body,n`
    <header class="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white">
      <div class="mx-auto flex max-w-[1400px] items-center gap-3 px-3 py-2 sm:px-4">
        <a href="#/" class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg bg-amber-400 text-slate-900">¥</span>
          <span class="leading-tight">BOOKOFF利益商品検索<span class="block text-[10px] font-normal text-slate-300">静岡・山梨・神奈川</span></span></a>
        <nav class="ml-auto hidden md:flex gap-1" aria-label="メイン">${oe.map(e=>n`<a href="#${e.path}" data-nav="${e.path}" class="rounded-md px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">${e.label}</a>`)}</nav>
      </div>
    </header>
    <div id="banner"></div>
    <main id="view" class="mx-auto max-w-[1400px] px-3 py-4 pb-24 sm:px-4 md:pb-8"></main>
    <nav class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden" aria-label="メイン（モバイル）">
      ${oe.map(e=>n`<a href="#${e.path}" data-nav="${e.path}" class="px-1 py-2.5 text-center text-[11px] text-slate-600">${e.short}</a>`)}
    </nav>`)}function We(){let e=N.counts.demo,t=d("#banner");if(e.products===0){$(t,n``);return}$(t,n`<div class="border-b border-violet-200 bg-violet-50" data-testid="demo-banner"><div class="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-3 py-2 text-sm text-violet-900 sm:px-4">
    <span class="rounded bg-violet-600 px-1.5 py-0.5 text-xs font-bold text-white">デモ</span>
    <span>架空のデモデータ ${e.products}件を含みます。価格・在庫は実在しません（実データ ${N.counts.real.products}件）。</span>
    <a href="#/import" class="ml-auto underline">デモの削除・CSV取込へ</a></div></div>`)}async function ee(){N=await x.meta(),We()}async function Ae(){let{path:e,query:t}=ce();document.querySelectorAll("[data-nav]").forEach(a=>{let i=a.dataset.nav===e;a.classList.toggle("!bg-slate-800",i&&!!a.closest("header")),a.classList.toggle("!text-amber-600",i&&!a.closest("header")),a.classList.toggle("font-semibold",i),i?a.setAttribute("aria-current","page"):a.removeAttribute("aria-current")});let s=d("#view"),r=oe.find(a=>a.path===e)?.label??"\u5229\u76CA\u5546\u54C1\u4E00\u89A7";document.title=`${r}\uFF5CBOOKOFF\u5229\u76CA\u5546\u54C1\u691C\u7D22`;try{e==="/check"?await Se(s,N):e==="/stores"?await Te(s,N):e==="/import"?ie(s,N,async a=>{await ee(),a&&ie(s,N,()=>ee())}):e==="/settings"?await Oe(s):e==="/sources"?await Pe(s):await ke(s,N,t)}catch(a){f(a.message,"error")}}async function Xe(){Ze();try{await ee()}catch(t){f(`\u8D77\u52D5\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF1A${t.message}`,"error");return}let e=ce().path;window.addEventListener("hashchange",()=>{let t=ce().path;(t!==e||t!=="/")&&(e=t,ee().then(Ae))}),await Ae()}Xe();
//# sourceMappingURL=app.js.map
