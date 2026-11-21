async function y(e,t,s){let r=await fetch(t,{method:e,headers:s!==void 0?{"content-type":"application/json"}:void 0,body:s!==void 0?JSON.stringify(s):void 0}),a=await r.json().catch(()=>({}));if(!r.ok)throw new Error(a.error??`HTTP ${r.status}`);return a}var f={meta:()=>y("GET","/api/meta"),me:()=>y("GET","/api/me"),users:()=>y("GET","/api/users"),createUser:e=>y("POST","/api/users",e),updateUser:(e,t)=>y("PUT",`/api/users/${e}`,t),deleteUser:e=>y("DELETE",`/api/users/${e}`),items:e=>y("GET",`/api/items?${e}`),product:e=>y("GET",`/api/products/${e}`),createProduct:e=>y("POST","/api/products",e),updateProduct:(e,t)=>y("PUT",`/api/products/${e}`,t),deleteProduct:e=>y("DELETE",`/api/products/${e}`),deleteOffer:e=>y("DELETE",`/api/offers/${e}`),deletePrice:e=>y("DELETE",`/api/market-prices/${e}`),addOffer:e=>y("POST","/api/offers",e),addPrice:e=>y("POST","/api/market-prices",e),importCsv:(e,t,s)=>y("POST",`/api/import/${e}`,{csv:t,filename:s}),diffStores:(e,t)=>y("POST","/api/import/stores?dryRun=1",{csv:e,filename:t}),recomputeEstimates:()=>y("POST","/api/estimates/recompute"),duplicates:()=>y("GET","/api/duplicates"),mergeProducts:(e,t)=>y("POST","/api/products/merge",{keepId:e,mergeIds:t}),stores:()=>y("GET","/api/stores"),storeSummary:(e="all")=>y("GET",`/api/store-summary?dataKind=${e}`),storeEvents:e=>y("GET",`/api/stores/${e}/events`),settings:()=>y("GET","/api/settings"),saveSettings:e=>y("PUT","/api/settings",e),providers:()=>y("GET","/api/providers"),runProvider:e=>y("POST",`/api/providers/${e}/fetch`),runBulk:async e=>(await y("POST",`/api/providers/${e}/fetch`)).bulk,seedDemo:()=>y("POST","/api/demo"),deleteDemo:()=>y("DELETE","/api/demo")};var ae={core:"\u7DCF\u5408",related:"\u95A2\u9023\u696D\u614B"};var re=["\u672C","CD","DVD\u30FBBD","\u30B2\u30FC\u30E0","\u30DB\u30D3\u30FC","\u5BB6\u96FB","\u305D\u306E\u4ED6"];var M=["mercari","yahoo_fleamarket","amazon_used"],R={mercari:"\u30E1\u30EB\u30AB\u30EA",yahoo_fleamarket:"Yahoo!\u30D5\u30EA\u30DE",amazon_used:"Amazon\u4E2D\u53E4"};var B={listing:"\u51FA\u54C1\u4FA1\u683C",sold:"\u58F2\u5374\u6E08\u307F\u4FA1\u683C",estimate:"\u63A8\u5B9A\u76F8\u5834"};var k="\u672A\u53D6\u5F97",ne=["admin","editor","viewer"],V={admin:"\u7BA1\u7406\u8005",editor:"\u7DE8\u96C6\u8005",viewer:"\u95B2\u89A7\u306E\u307F"};var J=class{constructor(t){this.value=t}value},A=e=>new J(e);function Ie(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function me(e){return e==null||e===!1?"":e instanceof J?e.value:Array.isArray(e)?e.map(me).join(""):Ie(e)}function n(e,...t){let s="";return e.forEach((r,a)=>{s+=r+(a<t.length?me(t[a]):"")}),new J(s)}function $(e,t){e.innerHTML=t.value}var c=(e,t=document)=>t.querySelector(e),C=(e,t=document)=>Array.from(t.querySelectorAll(e));function E(e,t,s,r){return n`${r!==void 0?n`<option value="">${r}</option>`:""}${e.map(a=>n`<option value="${a}" ${a===t?A("selected"):""}>${s?.[a]??a}</option>`)}`}function m(e,t="ok"){let s=document.createElement("div");s.setAttribute("role","status"),s.className=`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2 text-sm shadow-lg ${t==="ok"?"bg-slate-900 text-white":"bg-red-600 text-white"}`,s.textContent=e,document.body.appendChild(s),setTimeout(()=>s.remove(),3500)}function be(e,t){let s;return(...r)=>{s&&clearTimeout(s),s=setTimeout(()=>e(...r),t)}}var Be=["profit_desc","margin_desc","price_asc","updated_desc","premium_desc"];function W(e){if(e==null||e.trim()==="")return;let t=Number(e);return Number.isFinite(t)?t:void 0}function D(e){let t=e?.trim();return t||void 0}function ee(e){let t=e.get("sort"),s=e.get("dataKind"),r=e.get("marketplace");return{q:D(e.get("q")),code:D(e.get("code")),prefecture:D(e.get("prefecture")),store:D(e.get("store")),storeId:W(e.get("storeId")),brandType:D(e.get("brandType")),category:D(e.get("category")),minProfit:W(e.get("minProfit")),minMargin:W(e.get("minMargin")),priceMin:W(e.get("priceMin")),priceMax:W(e.get("priceMax")),stockStatus:D(e.get("stockStatus")),marketSince:D(e.get("marketSince")),dataKind:s==="real"||s==="demo"?s:"all",profitOnly:e.get("profitOnly")!=="0",marketplace:r&&M.includes(r)?r:void 0,premiumOnly:e.get("premiumOnly")==="1",belowList:e.get("belowList")==="1",bothOver:e.get("bothOver")==="1",needsFleaCheck:e.get("needsFleaCheck")==="1",sort:t&&Be.includes(t)?t:"profit_desc"}}function fe(e){let t=new URLSearchParams;for(let[s,r]of Object.entries(e))if(!(r==null||r==="")){if(s==="profitOnly"){r===!1&&t.set(s,"0");continue}if(s==="premiumOnly"||s==="belowList"||s==="bothOver"||s==="needsFleaCheck"){r===!0&&t.set(s,"1");continue}t.set(s,String(r))}return t}function le(e,t){return t?e.markets[t]?.profit??null:e.bestProfit}function T(e){return e==null||!Number.isFinite(e)?k:`${e<0?"\u2212":""}\xA5${Math.abs(e).toLocaleString("ja-JP")}`}function I(e){return e==null||!Number.isFinite(e)?k:e>0?`+${T(e)}`:T(e)}function H(e){return e==null||!Number.isFinite(e)?k:`${e.toFixed(1)}%`}function P(e){if(!e)return k;let t=Date.parse(e);if(Number.isNaN(t))return k;let s=new Date(t+9*3600*1e3),r=a=>String(a).padStart(2,"0");return`${s.getUTCFullYear()}/${r(s.getUTCMonth()+1)}/${r(s.getUTCDate())} ${r(s.getUTCHours())}:${r(s.getUTCMinutes())}`}var De="\u8981\u518D\u78BA\u8A8D";var ge=864e5;function xe(e,t,s=Date.now()){if(!e)return{status:"\u5728\u5EAB\u672A\u78BA\u8A8D",ageDays:null};let r=e.checkedAt?Date.parse(e.checkedAt):NaN,a=Number.isNaN(r)?null:Math.max(0,s-r),o=a==null?null:Math.floor(a/ge);return e.stockStatus==="\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09"&&t>0&&a!=null&&a>t*ge?{status:De,ageDays:o}:{status:e.stockStatus,ageDays:o}}function he(e){return e==null?"":e===0?"\u4ECA\u65E5\u78BA\u8A8D":`${e}\u65E5\u524D\u306B\u78BA\u8A8D`}function _e(e,t){return t==="floor"?Math.floor(e):t==="ceil"?Math.ceil(e):Math.round(e)}function ie(e){let{salePrice:t,purchasePrice:s}=e;if(t==null||s==null||!Number.isFinite(t)||!Number.isFinite(s)||t<=0||s<0)return null;let a=Math.max(_e(t*e.feeRatePercent/100,e.rounding??"floor"),e.minFee??0)+(e.fixedFee??0),o=t-s-a-e.shipping-e.otherCost,i=b=>Math.round(b*10)/10;return{salePrice:t,fee:a,shipping:e.shipping,otherCost:e.otherCost,profit:o,marginPercent:i(o/t*100),roiPercent:s>0?i(o/s*100):null}}function Z(e,t){let s=t?e.categoryFees?.[t]:void 0;return{feeRatePercent:s?.feeRatePercent??e.feeRatePercent,fixedFee:s?.fixedFee??0,minFee:s?.minFee??0}}function Ne(e){let t={listing:null,sold:null,estimate:null};for(let s of e){let r=t[s.priceType];(!r||s.observedAt>r.observedAt||s.observedAt===r.observedAt&&s.id>r.id)&&(t[s.priceType]=s)}return t}function ve(e){let{settings:t}=e,s={},r=null,a=null;for(let o of M){let i=Ne(e.prices.filter(g=>g.marketplace===o)),b=null;for(let g of t.priceTypePriority)if(i[g]){b=i[g];break}let d=t.marketplaces[o];if(!d){s[o]={marketplace:o,latest:i,chosen:b,profit:null};continue}let l=Z(d,e.category),p=ie({salePrice:b?.price??null,purchasePrice:e.purchasePrice,feeRatePercent:l.feeRatePercent,fixedFee:l.fixedFee,minFee:l.minFee,shipping:e.shippingOverride??d.shipping,otherCost:e.otherCostOverride??t.otherCost,rounding:t.rounding});s[o]={marketplace:o,latest:i,chosen:b,profit:p},p&&(!a||p.profit>a.profit)&&(r=o,a=p)}return{markets:s,best:r,bestProfit:a}}function X(e,t,s="dialog"){let r=document.createElement("dialog");return r.className="m-auto w-[min(56rem,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/50",r.dataset.testid=s,$(r,n`<div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <h2 class="font-semibold">${e}</h2>
      <button class="rounded p-1 text-slate-500 hover:bg-slate-100" data-close aria-label="閉じる">✕</button></div>
    <div class="p-4" data-body>${t}</div>`),r.addEventListener("click",a=>{(a.target===r||a.target.closest("[data-close]"))&&r.close()}),r.addEventListener("close",()=>r.remove()),document.body.appendChild(r),r.showModal(),r}var He=()=>new Date(Date.now()+324e5).toISOString().slice(0,16);async function U(e,t,s){let r=X("\u5546\u54C1\u8A73\u7D30",n`<p class="text-slate-500">読み込み中…</p>`,"detail-dialog"),a=c("[data-body]",r),o=async()=>{let[{product:i,offers:b,prices:d},l,{stores:p}]=await Promise.all([f.product(e),f.settings(),f.stores()]),g=u=>ve({prices:d,purchasePrice:u,settings:l,shippingOverride:i.shippingOverride,otherCostOverride:i.otherCostOverride,category:i.category}),h=b[0]??null,{markets:w}=g(h?.price??null),O=u=>{let x=w[u],L=x.profit,F=Z(l.marketplaces[u],i.category);return n`<div class="rounded-lg border border-slate-200 p-3" data-testid="calc-${u}">
        <div class="mb-2 font-semibold">${R[u]}</div>
        ${L?n`<dl class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm tabular-nums">
          <dt>想定販売価格（${B[x.chosen.priceType]}）</dt><dd class="text-right">${T(L.salePrice)}</dd>
          <dt>− 仕入れ価格</dt><dd class="text-right">${T(h?.price)}</dd>
          <dt>− 販売手数料（${F.feeRatePercent}%${F.minFee?`\u30FB\u6700\u4F4E${F.minFee}\u5186`:""}${F.fixedFee?`\uFF0B\u6210\u7D04\u6599${F.fixedFee}\u5186`:""}）</dt><dd class="text-right">${T(L.fee)}</dd>
          <dt>− 送料</dt><dd class="text-right">${T(L.shipping)}</dd>
          <dt>− その他費用</dt><dd class="text-right">${T(L.otherCost)}</dd>
          <dt class="border-t pt-1 font-semibold">想定利益</dt><dd class="border-t pt-1 text-right font-bold ${_(L.profit)}">${I(L.profit)}</dd>
          <dt>利益率 / 投資利益率</dt><dd class="text-right">${H(L.marginPercent)} / ${H(L.roiPercent)}</dd></dl>`:n`<p class="text-sm text-slate-500">${x.chosen?"\u4ED5\u5165\u308C\u4FA1\u683C\u304C\u672A\u53D6\u5F97\u306E\u305F\u3081\u8A08\u7B97\u3067\u304D\u307E\u305B\u3093":`\u76F8\u5834${k}\u306E\u305F\u3081\u8A08\u7B97\u3067\u304D\u307E\u305B\u3093`}</p>`}
      </div>`};$(a,n`
      <div class="flex flex-wrap items-start gap-3">
        <div class="ml-auto flex gap-2 order-2"><button type="button" class="btn-secondary !py-1 text-xs" id="edit-product">商品情報を編集</button>
          <button type="button" class="btn-danger !py-1 text-xs" id="delete-product">商品を削除</button></div>
        <div class="min-w-0 flex-1"><h3 class="text-lg font-semibold">${i.name} ${i.isDemo?q():""}</h3>
          <div class="mt-1 text-sm text-slate-500">${i.category}・JAN ${i.jan??k}・ISBN ${i.isbn??k}・定価 ${T(i.listPrice)}${i.listPriceSource?`\uFF08${i.listPriceSource}\uFF09`:""}</div>
          <div class="text-xs text-slate-400">情報取得元：${i.source}</div></div>
      </div>
      <div id="edit-wrap" class="hidden"><form id="edit-form" class="mt-3 grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
        <label class="sm:col-span-2"><span class="lbl">商品名</span><input class="inp" name="name" required maxlength="300" value="${i.name}"></label>
        <label><span class="lbl">JAN（8/13桁）</span><input class="inp" name="jan" inputmode="numeric" pattern="\\d{8}|\\d{13}" value="${i.jan??""}"></label>
        <label><span class="lbl">ISBN（10/13桁）</span><input class="inp" name="isbn" value="${i.isbn??""}"></label>
        <label><span class="lbl">カテゴリ</span><select class="inp" name="category">${E(t.categories,i.category)}</select></label>
        <label><span class="lbl">定価（税込・円）</span><input class="inp" name="listPrice" type="number" min="1" value="${i.listPrice??""}"></label>
        <label><span class="lbl">送料（個別・円）</span><input class="inp" name="shippingOverride" type="number" min="0" placeholder="空欄=設定値" value="${i.shippingOverride??""}"></label>
        <label><span class="lbl">その他費用（個別・円）</span><input class="inp" name="otherCostOverride" type="number" min="0" placeholder="空欄=設定値" value="${i.otherCostOverride??""}"></label>
        <label class="sm:col-span-2"><span class="lbl">画像URL</span><input class="inp" name="imageUrl" type="url" value="${i.imageUrl??""}"></label>
        <div class="flex gap-2 sm:col-span-2"><button class="btn-primary">保存</button><button type="button" class="btn-secondary" id="edit-cancel">やめる</button></div>
      </form></div>
      ${i.isDemo?n`<p class="mt-2 rounded bg-violet-50 p-2 text-xs text-violet-800">これは架空のデモデータです。価格・在庫は実在しません。</p>`:""}

      <h4 class="mt-5 mb-2 font-semibold">利益計算（${h?.store?.name??"\u5148\u982D\u306E\u5728\u5EAB"}の価格で計算）</h4>
      <div class="grid gap-3 md:grid-cols-3">${M.map(O)}</div>

      <h4 class="mt-5 mb-2 font-semibold">在庫・BOOKOFF価格</h4>
      ${b.length?n`<ul class="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">${b.map(u=>n`
        <li class="flex flex-wrap items-center gap-2 p-2"><span class="font-medium">${u.store?.name??`\u5E97\u8217${k}`}</span>
          <span class="tabular-nums">${T(u.price)}</span>${(()=>{let x=xe(u,l.stockFreshDays);return Y(x.status,x.ageDays)})()}<span class="text-xs text-slate-500">${u.condition}</span>
          <span class="ml-auto text-xs text-slate-400">確認 ${P(u.checkedAt)}・${u.source}</span>
          <button type="button" class="rounded px-1.5 text-xs text-red-600 hover:bg-red-50" data-del-offer="${u.id}" aria-label="この在庫情報を削除">削除</button></li>`)}</ul>`:n`<p class="text-sm text-slate-500">在庫情報は${k}です。</p>`}

      <h4 class="mt-5 mb-2 font-semibold">相場の履歴</h4>
      ${d.length?n`<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="text-left text-xs text-slate-500">
        <tr><th class="p-1">販路</th><th class="p-1">種別</th><th class="p-1 text-right">価格</th><th class="p-1 text-right">件数</th><th class="p-1">取得日時</th><th class="p-1">取得元</th><th class="p-1"></th></tr></thead>
        <tbody>${d.map(u=>n`<tr class="border-t border-slate-100"><td class="p-1">${R[u.marketplace]}</td>
          <td class="p-1">${B[u.priceType]}</td><td class="p-1 text-right tabular-nums">${T(u.price)}</td>
          <td class="p-1 text-right">${u.sampleCount??k}</td><td class="p-1 whitespace-nowrap">${P(u.observedAt)}</td>
          <td class="p-1 text-xs text-slate-500">${u.source}${u.note?`\uFF08${u.note}\uFF09`:""}</td>
          <td class="p-1"><button type="button" class="rounded px-1.5 text-xs text-red-600 hover:bg-red-50" data-del-price="${u.id}" aria-label="この相場を削除">削除</button></td></tr>`)}</tbody></table></div>`:n`<p class="text-sm text-slate-500">相場は${k}です。</p>`}

      <div class="mt-6 grid gap-4 md:grid-cols-2">
        <form id="price-form" class="space-y-2 rounded-lg bg-slate-50 p-3">
          <div class="font-semibold">相場を手動登録</div>
          <p class="text-xs text-slate-500">各アプリ・Amazonの商品ページで確認した価格を入力します。</p>
          <div class="grid grid-cols-2 gap-2">
            <label><span class="lbl">販路</span><select class="inp" name="marketplace">${E(t.marketplaces,"mercari",t.marketplaceLabel)}</select></label>
            <label><span class="lbl">価格種別</span><select class="inp" name="priceType">${E(t.priceTypes,"sold",t.priceTypeLabel)}</select></label>
            <label><span class="lbl">価格（円）</span><input class="inp" name="price" type="number" min="1" required inputmode="numeric"></label>
            <label><span class="lbl">サンプル数</span><input class="inp" name="sampleCount" type="number" min="0" inputmode="numeric"></label>
          </div>
          <label class="block"><span class="lbl">取得日時</span><input class="inp" name="observedAt" type="datetime-local" required value="${He()}"></label>
          <label class="block"><span class="lbl">備考</span><input class="inp" name="note" maxlength="300"></label>
          <button class="btn-primary w-full">相場を登録</button>
        </form>
        <form id="offer-form" class="space-y-2 rounded-lg bg-slate-50 p-3">
          <div class="font-semibold">在庫・価格を登録／更新</div>
          <p class="text-xs text-slate-500">同じ店舗の既存情報は上書きされます。確認日時がない場合は「在庫未確認」になります。</p>
          <label class="block"><span class="lbl">店舗</span><select class="inp" name="storeId"><option value="">店舗未指定</option>
            ${t.prefectures.map(u=>n`<optgroup label="${u}">${p.filter(x=>x.prefecture===u).map(x=>n`<option value="${x.id}">${x.name}${x.status!=="\u55B6\u696D\u4E2D"?`\uFF08${x.status}\uFF09`:""}</option>`)}</optgroup>`)}</select></label>
          <div class="grid grid-cols-2 gap-2">
            <label><span class="lbl">BOOKOFF価格（円）</span><input class="inp" name="price" type="number" min="0" inputmode="numeric"></label>
            <label><span class="lbl">商品状態</span><select class="inp" name="condition">${E(t.conditions,"\u72B6\u614B\u672A\u78BA\u8A8D")}</select></label>
            <label><span class="lbl">在庫状態</span><select class="inp" name="stockStatus">${E(t.stockStatuses,"\u5728\u5EAB\u672A\u78BA\u8A8D")}</select></label>
            <label><span class="lbl">在庫確認日時</span><input class="inp" name="checkedAt" type="datetime-local"></label>
          </div>
          <button class="btn-primary w-full">在庫を登録</button>
        </form>
      </div>`);let S=c("#edit-form",a),v=c("#edit-wrap",a);c("#edit-product",a).addEventListener("click",()=>v.classList.toggle("hidden")),c("#edit-cancel",a).addEventListener("click",()=>v.classList.add("hidden")),S.addEventListener("submit",async u=>{u.preventDefault();let x=new FormData(S),L=F=>String(x.get(F)??"").trim()?Number(x.get(F)):null;try{await f.updateProduct(e,{name:String(x.get("name")),jan:String(x.get("jan")??"").trim(),isbn:String(x.get("isbn")??"").trim(),category:String(x.get("category")),imageUrl:String(x.get("imageUrl")??"").trim(),listPrice:L("listPrice"),shippingOverride:L("shippingOverride"),otherCostOverride:L("otherCostOverride")}),m("\u5546\u54C1\u60C5\u5831\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F"),s(),await o()}catch(F){m(F.message,"error")}}),c("#delete-product",a).addEventListener("click",async()=>{if(confirm(`\u300C${i.name}\u300D\u3068\u3001\u305D\u306E\u5728\u5EAB\u30FB\u76F8\u5834\u306E\u8A18\u9332\u3092\u3059\u3079\u3066\u524A\u9664\u3057\u307E\u3059\u3002\u5143\u306B\u623B\u305B\u307E\u305B\u3093\u3002\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F`))try{await f.deleteProduct(e),m("\u5546\u54C1\u3092\u524A\u9664\u3057\u307E\u3057\u305F"),r.close(),s()}catch(u){m(u.message,"error")}}),a.querySelectorAll("[data-del-offer], [data-del-price]").forEach(u=>u.addEventListener("click",async()=>{let x=!!u.dataset.delOffer;if(confirm(x?"\u3053\u306E\u5E97\u8217\u306E\u5728\u5EAB\u30FB\u4FA1\u683C\u306E\u8A18\u9332\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F":"\u3053\u306E\u76F8\u5834\u306E\u8A18\u9332\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F"))try{x?await f.deleteOffer(Number(u.dataset.delOffer)):await f.deletePrice(Number(u.dataset.delPrice)),m("\u524A\u9664\u3057\u307E\u3057\u305F"),s(),await o()}catch(L){m(L.message,"error")}})),c("#price-form",a).addEventListener("submit",async u=>{u.preventDefault();let x=new FormData(u.target);try{await f.addPrice({productId:e,marketplace:x.get("marketplace"),priceType:x.get("priceType"),price:Number(x.get("price")),sampleCount:x.get("sampleCount")?Number(x.get("sampleCount")):null,observedAt:String(x.get("observedAt")),note:String(x.get("note")??"")}),m("\u76F8\u5834\u3092\u767B\u9332\u3057\u307E\u3057\u305F"),s(),await o()}catch(L){m(L.message,"error")}}),c("#offer-form",a).addEventListener("submit",async u=>{u.preventDefault();let x=new FormData(u.target);try{await f.addOffer({productId:e,storeId:x.get("storeId")?Number(x.get("storeId")):null,price:x.get("price")?Number(x.get("price")):null,condition:String(x.get("condition")),stockStatus:String(x.get("stockStatus")),checkedAt:String(x.get("checkedAt")??"")}),m("\u5728\u5EAB\u3092\u767B\u9332\u3057\u307E\u3057\u305F"),s(),await o()}catch(L){m(L.message,"error")}})};try{await o()}catch(i){$(a,n`<p class="text-red-600">${i.message}</p>`)}}function ye(e,t){let s=X("\u5546\u54C1\u3092\u624B\u52D5\u767B\u9332",n`<form id="create-form" class="space-y-3">
    <label class="block"><span class="lbl">商品名 *</span><input class="inp" name="name" required maxlength="300"></label>
    <div class="grid grid-cols-2 gap-2">
      <label><span class="lbl">JAN（8/13桁）</span><input class="inp" name="jan" inputmode="numeric" pattern="\\d{8}|\\d{13}"></label>
      <label><span class="lbl">ISBN（10/13桁）</span><input class="inp" name="isbn" inputmode="numeric" pattern="\\d{9}[\\dXx]|\\d{13}"></label>
      <label><span class="lbl">カテゴリ *</span><select class="inp" name="category">${E(e.categories,"\u672C")}</select></label>
      <label><span class="lbl">定価（税込・円）</span><input class="inp" name="listPrice" type="number" min="1" inputmode="numeric"></label>
      <label><span class="lbl">画像URL</span><input class="inp" name="imageUrl" type="url"></label>
      <label><span class="lbl">送料（個別・円）</span><input class="inp" name="shippingOverride" type="number" min="0" placeholder="空欄=設定値"></label>
      <label><span class="lbl">その他費用（個別・円）</span><input class="inp" name="otherCostOverride" type="number" min="0" placeholder="空欄=設定値"></label>
    </div>
    <p class="text-xs text-slate-500">登録後に開く詳細画面で、在庫・BOOKOFF価格と相場を追加できます。</p>
    <button class="btn-primary w-full">登録して詳細を開く</button></form>`,"create-dialog");c("#create-form",s).addEventListener("submit",async r=>{r.preventDefault();let a=new FormData(r.target),o=i=>a.get(i)?Number(a.get(i)):null;try{let i=await f.createProduct({name:String(a.get("name")),jan:String(a.get("jan")??""),isbn:String(a.get("isbn")??""),category:String(a.get("category")),imageUrl:String(a.get("imageUrl")??""),shippingOverride:o("shippingOverride"),otherCostOverride:o("otherCostOverride"),listPrice:o("listPrice")});s.close(),m("\u5546\u54C1\u3092\u767B\u9332\u3057\u307E\u3057\u305F"),t(),U(i.id,e,t)}catch(i){m(i.message,"error")}})}var $e={profit_desc:"\u5229\u76CA\u984D\u304C\u9AD8\u3044\u9806",margin_desc:"\u5229\u76CA\u7387\u304C\u9AD8\u3044\u9806",price_asc:"\u4ED5\u5165\u308C\u4FA1\u683C\u304C\u5B89\u3044\u9806",updated_desc:"\u66F4\u65B0\u65E5\u6642\u304C\u65B0\u3057\u3044\u9806",premium_desc:"\u30D7\u30EC\u30DF\u30A2\u7387\u304C\u9AD8\u3044\u9806\uFF08Amazon\u4E2D\u53E4\xF7\u5B9A\u4FA1\uFF09"},_=e=>e==null?"text-slate-400":e>0?"text-emerald-600":e<0?"text-red-600":"text-slate-700";function Y(e,t=null){let s=e??"\u5728\u5EAB\u672A\u78BA\u8A8D";return n`<span class="inline-flex flex-wrap items-center gap-x-1 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s==="\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09"?"bg-emerald-50 text-emerald-700 ring-emerald-200":s==="\u8981\u518D\u78BA\u8A8D"?"bg-orange-100 text-orange-800 ring-orange-300":s==="\u5728\u5EAB\u306A\u3057\uFF08\u78BA\u8A8D\u6E08\uFF09"?"bg-slate-100 text-slate-600 ring-slate-200":"bg-amber-50 text-amber-800 ring-amber-200"}" title="${s==="\u8981\u518D\u78BA\u8A8D"?"\u5728\u5EAB\u3042\u308A\u3068\u78BA\u8A8D\u3057\u3066\u304B\u3089\u65E5\u6570\u304C\u7D4C\u3063\u3066\u3044\u307E\u3059\u3002\u58F2\u308C\u3066\u3044\u308B\u53EF\u80FD\u6027\u304C\u3042\u308B\u306E\u3067\u3001\u884C\u304F\u524D\u306B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044":""}" data-testid="stock-chip"><span class="whitespace-nowrap">${s}</span>${t!=null?n`<span class="whitespace-nowrap font-normal opacity-80">${he(t)}</span>`:""}</span>`}function Se(e){let t=e.premium;return t.listPrice==null?n`<div class="text-[11px] text-slate-400">定価 ${k}</div>`:n`<div class="text-[11px] ${t.buyAtOrBelowList?"text-slate-500":"text-red-600"}">定価 ${T(t.listPrice)}${t.buyAtOrBelowList?"":"\uFF08\u8D85\u3048\uFF09"}</div>`}function te(e){let t=e.premium;return!t.overList||t.ratio==null?n``:t.bothOverList?n`<span class="inline-block rounded bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold leading-tight text-white" title="Amazon中古とフリマの売却済み価格の両方が定価を超えています" data-testid="premium-badge">両方で定価超え <span class="whitespace-nowrap">Amazon ${t.ratio.toFixed(2)}倍・フリマ ${t.fleaRatio.toFixed(2)}倍</span></span>`:n`<span class="inline-flex shrink-0 items-center whitespace-nowrap rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-700" title="Amazon中古の相場が定価を超えています" data-testid="premium-badge">プレミア 定価の${t.ratio.toFixed(2)}倍</span>`}var q=()=>n`<span class="inline-flex shrink-0 items-center whitespace-nowrap rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700" title="架空のデモデータ">デモ</span>`;function Ee(e,t="h-14 w-14"){return e.product.imageUrl?n`<img src="${e.product.imageUrl}" alt="" loading="lazy" referrerpolicy="no-referrer" class="${t} shrink-0 rounded bg-slate-100 object-cover">`:n`<div class="${t} shrink-0 rounded bg-slate-100 text-[10px] leading-tight text-slate-400 grid place-items-center text-center">画像<br>未取得</div>`}function oe(e){if(!e.chosen)return n`<span class="text-slate-400">${k}</span>`;let t=["estimate","sold","listing"].filter(s=>e.latest[s]&&e.latest[s].id!==e.chosen.id);return n`<div class="font-semibold tabular-nums">${T(e.chosen.price)}</div>
    <div class="text-[11px] text-slate-500">${B[e.chosen.priceType]}${e.chosen.sampleCount!=null?` (n=${e.chosen.sampleCount})`:""}</div>
    ${t.map(s=>n`<div class="text-[11px] text-slate-400">${B[s]} ${T(e.latest[s].price)}</div>`)}
    <div class="text-[11px] tabular-nums ${_(e.profit?.profit)}">利益 ${I(e.profit?.profit)}</div>`}function we(e,t){let s=le(e,t),r=t??e.best,a=r&&s?R[r]:null;return n`<tr class="cursor-pointer border-b border-slate-100 hover:bg-amber-50/40 align-top" data-product="${e.product.id}" data-testid="item-row">
    <td class="p-2"><div class="flex gap-3">${Ee(e)}<div class="min-w-0">
      <div class="font-medium text-slate-900 line-clamp-2">${e.product.name}</div>
      <div class="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
        <span class="rounded bg-slate-100 px-1.5 py-0.5">${e.product.category}</span>
        <span>${e.product.jan?`JAN ${e.product.jan}`:e.product.isbn?`ISBN ${e.product.isbn}`:"JAN/ISBN \u672A\u53D6\u5F97"}</span>
        ${te(e)}${e.isDemo?q():""}
      </div></div></div></td>
    <td class="p-2 text-right whitespace-nowrap"><div class="font-semibold tabular-nums">${T(e.offer?.price)}</div>${Se(e)}<div class="text-[11px] text-slate-500">${e.offer?.condition??k}</div></td>
    <td class="p-2"><div class="text-sm">${e.store?.name??k}</div>
      <div class="text-[11px] text-slate-500">${e.store?`${e.store.prefecture}\u30FB${e.store.brandType}`:""}</div>
      <div class="mt-1">${Y(e.stock.status,e.stock.ageDays)}</div></td>
    <td class="p-2 text-right whitespace-nowrap">${oe(e.markets.mercari)}</td>
    <td class="p-2 text-right whitespace-nowrap">${oe(e.markets.yahoo_fleamarket)}</td>
    <td class="p-2 text-right whitespace-nowrap">${oe(e.markets.amazon_used)}</td>
    <td class="p-2 text-right"><div class="text-base font-bold tabular-nums ${_(s?.profit)}" data-testid="profit">${I(s?.profit)}</div>
      <div class="whitespace-nowrap text-[11px] text-slate-500">${a?`${a}\u3067\u8CA9\u58F2`:""}</div></td>
    <td class="p-2 text-right"><div class="font-semibold tabular-nums ${_(s?.profit)}">${H(s?.marginPercent)}</div>
      <div class="text-[11px] text-slate-500">ROI ${H(s?.roiPercent)}</div></td>
    <td class="p-2 text-[11px] text-slate-500 whitespace-nowrap"><div>在庫 ${P(e.offer?.checkedAt)}</div><div>相場 ${P(e.latestMarketObservedAt)}</div></td>
  </tr>`}function ke(e,t){let s=le(e,t),r=t??e.best,a=o=>{let i=e.markets[o];return n`<div class="rounded bg-slate-50 p-2"><div class="text-[11px] text-slate-500">${R[o]}相場</div>
      <div class="font-semibold tabular-nums">${i.chosen?T(i.chosen.price):k}</div>
      <div class="text-[11px] text-slate-500">${i.chosen?B[i.chosen.priceType]:""}</div>
      <div class="text-[11px] tabular-nums ${_(i.profit?.profit)}">利益 ${I(i.profit?.profit)}</div></div>`};return n`<article class="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:bg-slate-50" data-product="${e.product.id}" data-testid="item-card">
    <div class="flex gap-3">${Ee(e,"h-16 w-16")}<div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2"><h3 class="font-medium leading-snug line-clamp-2">${e.product.name}</h3>${e.isDemo?q():""}</div>
      ${e.premium.overList?n`<div class="mt-1">${te(e)}</div>`:""}
      <div class="mt-1 text-[11px] text-slate-500">${e.product.category}・${e.store?.name??`\u5E97\u8217${k}`}</div>
      <div class="mt-1">${Y(e.stock.status,e.stock.ageDays)}</div></div></div>
    <div class="mt-3 flex items-end justify-between rounded-lg px-3 py-2 ${s==null?"bg-slate-50":s.profit>0?"bg-emerald-50":"bg-red-50"}">
      <div><div class="text-[11px] text-slate-500">想定利益${r&&s?`\uFF08${R[r]}\u3067\u8CA9\u58F2\uFF09`:""}</div>
        <div class="text-xl font-bold tabular-nums ${_(s?.profit)}" data-testid="profit">${I(s?.profit)}</div></div>
      <div class="text-right"><div class="text-[11px] text-slate-500">利益率</div><div class="font-semibold ${_(s?.profit)}">${H(s?.marginPercent)}</div></div>
    </div>
    <div class="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
      <div class="rounded bg-amber-50 p-2"><div class="text-[11px] text-slate-500">BOOKOFF価格</div><div class="font-semibold tabular-nums">${T(e.offer?.price)}</div>${Se(e)}</div>
      ${M.map(a)}
    </div>
    <div class="mt-1 text-[11px] text-slate-400">情報取得 ${P(e.updatedAt)}</div>
  </article>`}function Ue(e,t){let s=(r,a,o="text",i="")=>n`<label class="block"><span class="lbl">${a}</span>
    <input class="inp" name="${r}" type="${o}" value="${t[r]??""}" ${A(i)}></label>`;return n`<form id="filters" class="space-y-3" autocomplete="off">
    <label class="flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-sm font-semibold text-emerald-800">
      <input type="checkbox" name="profitOnly" value="1" class="h-4 w-4 accent-emerald-600" ${t.profitOnly!==!1?A("checked"):""}> 利益が出る商品のみ表示</label>
    <div class="space-y-1 rounded-lg bg-rose-50 p-2">
      <label class="flex items-center gap-2 text-sm font-semibold text-rose-800"><input type="checkbox" name="premiumOnly" value="1" class="h-4 w-4 accent-rose-600" ${t.premiumOnly?A("checked"):""}> Amazon中古が定価超え（プレミア）のみ</label>
      <label class="flex items-center gap-2 text-sm font-semibold text-rose-800"><input type="checkbox" name="bothOver" value="1" class="h-4 w-4 accent-rose-600" ${t.bothOver?A("checked"):""}> フリマの売却済み価格でも定価超え（両方）のみ</label>
      <label class="flex items-center gap-2 text-sm font-semibold text-rose-800"><input type="checkbox" name="belowList" value="1" class="h-4 w-4 accent-rose-600" ${t.belowList?A("checked"):""}> BOOKOFF価格が定価以下のみ</label>
      <p class="text-[11px] leading-snug text-rose-700">フリマ側はYahoo!フリマ・メルカリの売却済み価格のうち低い方で判定します。
        フリマ未確認の候補は<a class="font-semibold underline" href="#/check">確認待ち</a>へ。</p>
      <button type="button" id="premium-preset" class="mt-1 w-full rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700">プレミア商品を探す</button>
    </div>
    <label class="block"><span class="lbl">利益を判定する販路</span><select class="inp" name="marketplace">
      ${E([...M],t.marketplace,R,"\u6700\u3082\u5229\u76CA\u304C\u51FA\u308B\u8CA9\u8DEF")}</select></label>
    ${s("q","\u5546\u54C1\u540D","search",'placeholder="\u4F8B\uFF1A\u554F\u984C\u96C6"')}
    ${s("code","JAN\u30FBISBN","search",'inputmode="numeric" placeholder="\u4E00\u90E8\u3067\u3082\u53EF"')}
    <div class="grid grid-cols-2 gap-2">
      <label class="block"><span class="lbl">都道府県</span><select class="inp" name="prefecture">${E(e.prefectures,t.prefecture,void 0,"\u3059\u3079\u3066")}</select></label>
      <label class="block"><span class="lbl">店舗種別</span><select class="inp" name="brandType">
        <option value="">すべて</option>
        <option value="core" ${t.brandType==="core"?A("selected"):""}>総合（BOOKOFF系3業態）</option>
        <option value="related" ${t.brandType==="related"?A("selected"):""}>関連業態</option>
        ${E(e.brandTypes,t.brandType)}</select></label>
    </div>
    ${t.storeId!==void 0?n`<input type="hidden" name="storeId" value="${t.storeId}">
      <div class="flex items-center justify-between gap-2 rounded-lg bg-amber-50 p-2 text-sm" data-testid="store-chip">
        <span>店舗：<b id="store-chip-name">選択中の店舗</b></span>
        <button type="button" id="clear-store" class="rounded px-2 text-slate-500 hover:bg-amber-100" aria-label="店舗の指定を外す">✕</button></div>`:""}
    ${s("store","\u5E97\u8217\u540D","search",'list="store-names" placeholder="\u4F8B\uFF1A\u5BCC\u58EB\u5BAE"')}
    <datalist id="store-names"></datalist>
    <div class="grid grid-cols-2 gap-2">
      <label class="block"><span class="lbl">カテゴリ</span><select class="inp" name="category">${E(e.categories,t.category,void 0,"\u3059\u3079\u3066")}</select></label>
      <label class="block"><span class="lbl">在庫確認状態</span><select class="inp" name="stockStatus">${E(e.filterStockStatuses,t.stockStatus,void 0,"\u3059\u3079\u3066")}</select></label>
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
        ${E(["all","real","demo"],t.dataKind,{all:"\u3059\u3079\u3066",real:"\u5B9F\u30C7\u30FC\u30BF\u306E\u307F",demo:"\u30C7\u30E2\u306E\u307F"})}</select></label>
    </div>
    <div class="flex gap-2 pt-1"><button type="reset" class="btn-secondary flex-1" id="reset-filters">条件をクリア</button></div>
  </form>`}var j=new URLSearchParams,K=0;async function Te(e,t,s){let r=ee(s);$(e,n`
    <div class="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-6">
      <aside class="mb-4 lg:mb-0">
        <details class="group rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-20" id="filter-panel" ${window.matchMedia("(min-width:1024px)").matches?A("open"):""}>
          <summary class="flex cursor-pointer list-none items-center justify-between font-semibold">
            <span>絞り込み</span><span class="text-xs text-slate-400 group-open:hidden">タップで開く</span></summary>
          <div class="mt-3">${Ue(t,r)}</div>
        </details>
      </aside>
      <section class="min-w-0">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <div class="text-sm text-slate-600" id="result-count" aria-live="polite">読み込み中…</div>
          <div class="ml-auto flex flex-wrap items-center gap-2">
            <label class="sr-only" for="sort">並び替え</label>
            <select id="sort" class="inp !w-auto">${E(Object.keys($e),r.sort,$e)}</select>
            <button id="amazon-refresh" class="btn-secondary hidden" type="button" title="Keepa APIでAmazon中古価格を取得">Amazon中古価格を更新</button>
            <a id="export" class="btn-secondary" href="#">CSVエクスポート</a>
            <button id="add-product" class="btn-primary" type="button">＋ 手動登録</button>
          </div>
        </div>
        <div id="results"></div>
      </section>
    </div>`),f.stores().then(({stores:l})=>{let p=c("#store-names");p&&$(p,n`${l.map(h=>n`<option value="${h.name}"></option>`)}`);let g=c("#store-chip-name");g&&r.storeId!==void 0&&(g.textContent=l.find(h=>h.id===r.storeId)?.name??`\u5E97\u8217ID ${r.storeId}`)}).catch(()=>{});let a=c("#filters",e),o=c("#sort",e),i=()=>{let l=new URLSearchParams;return new FormData(a).forEach((p,g)=>{String(p).trim()!==""&&l.set(g,String(p))}),l.set("profitOnly",c("input[name=profitOnly]",a).checked?"1":"0"),l.set("premiumOnly",c("input[name=premiumOnly]",a).checked?"1":"0"),l.set("belowList",c("input[name=belowList]",a).checked?"1":"0"),l.set("bothOver",c("input[name=bothOver]",a).checked?"1":"0"),l.set("sort",o.value),ee(l)},b=async()=>{let l=i();j=fe(l),l.dataKind==="all"&&j.delete("dataKind"),history.replaceState(null,"",`#/?${j}`),c("#export",e).href=`/api/export.csv?${j}`,await Q(e)},d=be(b,250);a.addEventListener("input",d),a.addEventListener("change",d),a.addEventListener("submit",l=>{l.preventDefault(),b()}),a.addEventListener("reset",()=>setTimeout(()=>{c("input[name=profitOnly]",a).checked=!0,b()},0)),o.addEventListener("change",b),c("#clear-store",e)?.addEventListener("click",()=>{c("input[name=storeId]",a)?.remove(),c("[data-testid=store-chip]",a)?.remove(),b()}),c("#premium-preset",e).addEventListener("click",()=>{c("input[name=premiumOnly]",a).checked=!0,c("input[name=belowList]",a).checked=!0,c("input[name=bothOver]",a).checked=!0,c("input[name=profitOnly]",a).checked=!0,c("select[name=marketplace]",a).value="amazon_used",o.value="premium_desc",b()}),c("#add-product",e).addEventListener("click",()=>ye(t,()=>Q(e))),f.providers().then(({providers:l})=>{let p=l.find(h=>h.id==="amazon-used-keepa"),g=c("#amazon-refresh",e);!p?.configured||!g||(g.classList.remove("hidden"),g.addEventListener("click",async()=>{g.disabled=!0,g.textContent="\u53D6\u5F97\u4E2D\u2026";try{let h=await f.runBulk("amazon-used-keepa");m(`Amazon\u4E2D\u53E4\u4FA1\u683C\uFF1A${h.requested}\u4EF6\u3092\u7167\u4F1A\u3001${h.matched}\u4EF6\u53D6\u5F97\u3001${h.notFound}\u4EF6\u898B\u3064\u304B\u3089\u305A\u3001\u5B9A\u4FA1${h.listPricesSet}\u4EF6\u3092\u8A2D\u5B9A`),await Q(e)}catch(h){m(h.message,"error")}g.disabled=!1,g.textContent="Amazon\u4E2D\u53E4\u4FA1\u683C\u3092\u66F4\u65B0"}))}).catch(()=>{}),c("#results",e).addEventListener("keydown",l=>{let p=l.target.closest("[data-product]");p&&(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),U(Number(p.dataset.product),t,()=>Q(e)))}),c("#results",e).addEventListener("click",l=>{let p=l.target.closest("[data-product]");p&&U(Number(p.dataset.product),t,()=>Q(e))}),await b()}async function Q(e){let t=c("#results",e);if(t){try{let{rows:s,matched:r,total:a}=await f.items(j);K=s.length;let o=ee(j),i=o.marketplace,b=o.bothOver?`\u4E21\u65B9\u3067\u5B9A\u4FA1\u8D85\u3048\u306E\u5546\u54C1 ${r.toLocaleString()}\u4EF6`:o.premiumOnly?`\u30D7\u30EC\u30DF\u30A2\u5546\u54C1 ${r.toLocaleString()}\u4EF6`:o.profitOnly?`\u5229\u76CA\u304C\u51FA\u308B\u5546\u54C1 ${r.toLocaleString()}\u4EF6`:`${r.toLocaleString()}\u4EF6 \u8A72\u5F53`,d=()=>`${b}\uFF08\u5168${a.toLocaleString()}\u4EF6\uFF09${r>K?`\u30FB${K}\u4EF6\u3092\u8868\u793A\u4E2D`:""}`;if(c("#result-count",e).textContent=d(),s.length===0){$(t,n`<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        ${o.profitOnly?"\u6761\u4EF6\u306B\u5408\u3046\u3001\u5229\u76CA\u304C\u51FA\u308B\u5546\u54C1\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u300C\u5229\u76CA\u304C\u51FA\u308B\u5546\u54C1\u306E\u307F\u8868\u793A\u300D\u3092\u5916\u3059\u3068\u5168\u4EF6\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002":"\u6761\u4EF6\u306B\u5408\u3046\u5546\u54C1\u304C\u3042\u308A\u307E\u305B\u3093\u3002"}<br>
        <a class="text-sky-700 underline" href="#/import">CSVを取り込む</a>か、「＋ 手動登録」から追加してください。</div>`);return}$(t,n`
      <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full min-w-[1080px] text-sm" data-testid="items-table">
          <thead class="sticky top-0 bg-slate-50 text-left text-xs font-semibold text-slate-600">
            <tr><th class="p-2">商品名</th><th class="p-2 text-right whitespace-nowrap">BOOKOFF価格</th><th class="p-2">対象店舗</th>
              <th class="p-2 text-right whitespace-nowrap">メルカリ相場</th><th class="p-2 text-right whitespace-nowrap">Yahoo!フリマ相場</th>
              <th class="p-2 text-right whitespace-nowrap">Amazon中古相場</th>
              <th class="p-2 text-right">想定利益</th><th class="p-2 text-right">利益率</th><th class="p-2">情報取得日時</th></tr>
          </thead>
          <tbody>${s.map(l=>we(l,i))}</tbody>
        </table>
      </div>
      <div class="grid gap-3 md:hidden" data-testid="items-cards">${s.map(l=>ke(l,i))}</div>
      ${r>s.length?n`<div class="mt-4 text-center"><button type="button" id="load-more" class="btn-secondary">さらに表示（残り ${r-s.length}件）</button></div>`:""}`),c("#load-more",t)?.addEventListener("click",async function(){let p=this;p.disabled=!0;try{let g=new URLSearchParams(j);g.set("offset",String(K));let h=await f.items(g),w=c("[data-testid=items-table] tbody",t),O=c("[data-testid=items-cards]",t);w.insertAdjacentHTML("beforeend",n`${h.rows.map(S=>we(S,i))}`.value),O.insertAdjacentHTML("beforeend",n`${h.rows.map(S=>ke(S,i))}`.value),K+=h.rows.length,C("[data-product]",t).forEach(S=>S.setAttribute("tabindex","0")),c("#result-count",e).textContent=d(),K>=r?p.parentElement.remove():(p.textContent=`\u3055\u3089\u306B\u8868\u793A\uFF08\u6B8B\u308A ${r-K}\u4EF6\uFF09`,p.disabled=!1)}catch(g){m(g.message,"error"),p.disabled=!1}})}catch(s){m(`\u4E00\u89A7\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF1A${s.message}`,"error")}C("[data-product]",t).forEach(s=>s.setAttribute("tabindex","0"))}}var Ke=e=>`https://jp.mercari.com/search?keyword=${encodeURIComponent(e)}`,je=e=>`https://paypayfleamarket.yahoo.co.jp/search/${encodeURIComponent(e)}`,ze=()=>new Date(Date.now()+9*36e5).toISOString().slice(0,16);function Ye(e){let t=e.premium,s=e.product.name;return n`<article class="rounded-xl border border-slate-200 bg-white p-4" data-testid="check-card" data-product="${e.product.id}">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0"><h3 class="font-medium leading-snug">${e.product.name}</h3>
        <div class="mt-1 text-xs text-slate-500">${e.product.category}・${e.product.jan?`JAN ${e.product.jan}`:e.product.isbn?`ISBN ${e.product.isbn}`:"JAN/ISBN \u672A\u53D6\u5F97"}</div></div>
      ${e.isDemo?q():""}
    </div>
    <div class="mt-2">${te(e)}</div>
    <dl class="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
      <div class="rounded bg-slate-50 p-2"><dt class="text-[11px] text-slate-500">定価</dt><dd class="font-semibold tabular-nums">${T(t.listPrice)}</dd></div>
      <div class="rounded bg-slate-50 p-2"><dt class="text-[11px] text-slate-500">Amazon中古</dt><dd class="font-semibold tabular-nums">${T(t.amazonPrice)}</dd></div>
      <div class="rounded bg-amber-50 p-2"><dt class="text-[11px] text-slate-500">BOOKOFF</dt><dd class="font-semibold tabular-nums">${T(e.offer?.price)}</dd></div>
    </dl>
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>${e.store?.name??`\u5E97\u8217${k}`}</span>${Y(e.stock.status,e.stock.ageDays)}</div>
    <div class="mt-3 flex flex-wrap gap-2">
      <a class="btn-secondary !py-1.5 text-xs" href="${Ke(s)}" target="_blank" rel="noopener noreferrer">メルカリで探す ↗</a>
      <a class="btn-secondary !py-1.5 text-xs" href="${je(s)}" target="_blank" rel="noopener noreferrer">Yahoo!フリマで探す ↗</a>
    </div>
    <form class="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[auto_1fr_6rem_auto]" data-flea-form>
      <label><span class="lbl">販路</span><select class="inp" name="marketplace"><option value="yahoo_fleamarket">Yahoo!フリマ</option><option value="mercari">メルカリ</option></select></label>
      <label><span class="lbl">売れた価格（円）</span><input class="inp" name="price" type="number" min="1" required inputmode="numeric" placeholder="例：1800"></label>
      <label><span class="lbl">見た件数</span><input class="inp" name="sampleCount" type="number" min="1" inputmode="numeric" placeholder="例：5"></label>
      <div class="flex items-end"><button class="btn-primary w-full">登録</button></div>
    </form>
  </article>`}async function Le(e,t){let s=new URLSearchParams({needsFleaCheck:"1",profitOnly:"0",sort:"premium_desc",limit:"200"}),{rows:r}=await f.items(s);$(e,n`
    <div class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <div class="font-semibold">フリマで売れた価格の確認待ち：${r.length}件</div>
      <p class="mt-1">Amazon中古では定価を超えていて、BOOKOFFでは定価以下で買える商品のうち、フリマの売却済み価格がまだ無いものです。
      「メルカリで探す」「Yahoo!フリマで探す」で検索を開き、<b>「売り切れ」に絞り込んで</b>直近数件の真ん中くらいの価格を登録してください。
      登録すると、両方で定価を超えた商品は一覧の「プレミア商品を探す」に表示されます。</p>
    </div>
    ${r.length?n`<div class="grid gap-3 lg:grid-cols-2" id="check-list">${r.map(Ye)}</div>`:n`<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">確認待ちの商品はありません。
        <br>Amazon中古の価格と定価が入ると、ここに候補が出ます（データ取得元画面の「一括取得」かCSVで登録）。</div>`}`),C("[data-flea-form]",e).forEach(a=>a.addEventListener("submit",async o=>{o.preventDefault();let i=a.closest("[data-product]"),b=Number(i.dataset.product),d=new FormData(a),l=Number(d.get("price"));try{await f.addPrice({productId:b,marketplace:d.get("marketplace"),priceType:"sold",price:l,sampleCount:d.get("sampleCount")?Number(d.get("sampleCount")):null,observedAt:ze(),note:"\u78BA\u8A8D\u5F85\u3061\u753B\u9762\u304B\u3089\u767B\u9332"});let g=(await f.items(new URLSearchParams({q:"",profitOnly:"0",bothOver:"1",limit:"2000"}))).rows.some(O=>O.product.id===b);m(g?"\u767B\u9332\u3057\u307E\u3057\u305F\uFF1A\u4E21\u65B9\u3067\u5B9A\u4FA1\u8D85\u3048\u3067\u3059\u3002\u30D7\u30EC\u30DF\u30A2\u5546\u54C1\u306E\u4E00\u89A7\u306B\u8868\u793A\u3055\u308C\u307E\u3059":"\u767B\u9332\u3057\u307E\u3057\u305F\uFF1A\u30D5\u30EA\u30DE\u3067\u306F\u5B9A\u4FA1\u4EE5\u4E0B\u3067\u3057\u305F\u3002\u5019\u88DC\u304B\u3089\u5916\u308C\u307E\u3059"),i.remove();let h=C("[data-testid=check-card]",e).length,w=c(".font-semibold",e);w&&(w.textContent=`\u30D5\u30EA\u30DE\u3067\u58F2\u308C\u305F\u4FA1\u683C\u306E\u78BA\u8A8D\u5F85\u3061\uFF1A${h}\u4EF6`)}catch(p){m(p.message,"error")}}))}function de(e){try{return{text:new TextDecoder("utf-8",{fatal:!0}).decode(e),encoding:"utf-8"}}catch{return{text:new TextDecoder("shift_jis").decode(e),encoding:"shift_jis"}}}var z=(e,t,s="")=>n`<section class="rounded-xl border border-slate-200 bg-white p-4 ${s}">
  <h2 class="mb-3 font-semibold">${e}</h2>${t}</section>`,Oe=e=>e==="\u55B6\u696D\u4E2D"?"bg-emerald-50 text-emerald-700":e==="\u9589\u5E97"?"bg-slate-200 text-slate-600":"bg-amber-50 text-amber-800";async function Pe(e,t){let[{stores:s},{summary:r}]=await Promise.all([f.stores(),f.storeSummary()]),a=new Map(r.map(d=>[d.storeId,d])),o=t.prefectures.map(d=>({p:d,n:s.filter(l=>l.prefecture===d).length}));$(e,n`
    <div class="mb-3 grid grid-cols-3 gap-2 sm:gap-3">${o.map(({p:d,n:l})=>n`<button type="button" data-pref="${d}" class="rounded-xl border border-slate-200 bg-white p-2 text-left hover:border-amber-400 sm:p-3">
      <div class="text-xs text-slate-500">${d}</div><div class="text-xl font-bold sm:text-2xl">${l}<span class="text-xs font-normal text-slate-500 sm:text-sm"> 店舗</span></div>
      <div class="text-[11px] text-emerald-700">利益商品のある店舗 ${s.filter(p=>p.prefecture===d&&(a.get(p.id)?.profitable??0)>0).length}</div></button>`)}</div>
    <p class="mb-3 text-xs text-slate-500">県を選ぶと、利益が出る商品のある店舗を想定利益の多い順に並べます。店舗をタップするとその店舗の商品一覧を開きます。
      <span class="hidden sm:inline">初期データ：${t.storeSeed.source}（確認 ${P(t.storeSeed.verifiedAt)}）。閉店・移転・改称は「取込・出力」の店舗CSVで更新できます。</span></p>
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <select id="st-pref" class="inp !w-auto" aria-label="都道府県">${E(t.prefectures,void 0,void 0,"\u3059\u3079\u3066\u306E\u90FD\u9053\u5E9C\u770C")}</select>
      <select id="st-sort" class="inp !w-auto" aria-label="並び替え">${E(["profit","count","premium","official"],"profit",{profit:"\u60F3\u5B9A\u5229\u76CA\u5408\u8A08\u304C\u591A\u3044\u9806\uFF08\u5728\u5EAB\u78BA\u8A8D\u6E08\uFF09",count:"\u5229\u76CA\u5546\u54C1\u304C\u591A\u3044\u9806",premium:"\u4E21\u65B9\u3067\u5B9A\u4FA1\u8D85\u3048\u304C\u591A\u3044\u9806",official:"\u516C\u5F0F\u4E00\u89A7\u306E\u9806"})}</select>
      <label class="flex items-center gap-1.5 text-sm"><input id="st-only" type="checkbox" class="h-4 w-4 accent-emerald-600" checked> 利益商品がある店舗のみ</label>
      <input id="st-q" class="inp !w-48" type="search" placeholder="店舗名・住所で検索" aria-label="店舗検索">
      <select id="st-brand" class="inp !w-auto" aria-label="店舗種別">${E(t.brandTypes,void 0,void 0,"\u3059\u3079\u3066\u306E\u7A2E\u5225")}</select>
      <select id="st-status" class="inp !w-auto" aria-label="状態">${E(t.storeStatuses,void 0,void 0,"\u3059\u3079\u3066\u306E\u72B6\u614B")}</select>
      <span id="st-count" class="text-sm text-slate-500"></span>
    </div>
    <div id="st-list"></div>`);let i=d=>a.get(d)??{storeId:d,profitable:0,profitableInStock:0,profitableUnconfirmed:0,profitableStale:0,premiumBoth:0,profitSumInStock:0,lastCheckedAt:null},b=()=>{let d=c("#st-q").value.trim(),l=c("#st-pref").value,p=c("#st-brand").value,g=c("#st-status").value,h=c("#st-only").checked,w=c("#st-sort").value,O=s.filter(v=>(!d||v.name.includes(d)||v.address.includes(d))&&(!l||v.prefecture===l)&&(!p||v.brandType===p)&&(!g||v.status===g)&&(!h||i(v.id).profitable>0)),S=v=>{let u=i(v.id);return w==="profit"?u.profitSumInStock:w==="count"?u.profitable:w==="premium"?u.premiumBoth:0};if(w!=="official"&&O.sort((v,u)=>S(u)-S(v)||i(u.id).profitable-i(v.id).profitable||v.id-u.id),c("#st-count").textContent=`${O.length}\u5E97\u8217`,!O.length){$(c("#st-list"),n`<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500" data-testid="stores-empty">
        条件に合う店舗はありません。${h?"\u300C\u5229\u76CA\u5546\u54C1\u304C\u3042\u308B\u5E97\u8217\u306E\u307F\u300D\u3092\u5916\u3059\u3068\u5168\u5E97\u8217\u3092\u8868\u793A\u3057\u307E\u3059\u3002":""}</div>`);return}$(c("#st-list"),n`
      <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white"><table class="w-full min-w-[980px] text-sm" data-testid="stores-table">
        <thead class="bg-slate-50 text-left text-xs text-slate-600"><tr><th class="p-2">店舗名</th><th class="p-2">所在地</th><th class="p-2">状態</th>
          <th class="p-2 text-right">利益商品<br><span class="font-normal">在庫確認済／全件</span></th><th class="p-2 text-right">両方で<br>定価超え</th>
          <th class="p-2 text-right">想定利益合計<br><span class="font-normal">在庫確認済</span></th><th class="p-2">最終在庫確認</th><th class="p-2"></th></tr></thead>
        <tbody>${O.map(v=>Ve(v,i(v.id)))}</tbody></table></div>
      <div class="grid gap-2 md:hidden" data-testid="stores-cards">${O.map(v=>Je(v,i(v.id)))}</div>`)};C("#st-q, #st-pref, #st-brand, #st-status, #st-only, #st-sort",e).forEach(d=>d.addEventListener("input",b)),C("[data-pref]",e).forEach(d=>d.addEventListener("click",()=>{c("#st-pref").value=d.dataset.pref,b(),c("#st-list")?.scrollIntoView({behavior:"smooth",block:"start"})})),e.addEventListener("click",async d=>{let l=d.target;if(l.closest("a"))return;let p=l.closest("[data-store-info]");if(p)return d.stopPropagation(),qe(s,Number(p.dataset.storeInfo));let g=l.closest("[data-store]");g&&(location.hash=`#/?storeId=${g.dataset.store}&profitOnly=0`)}),b()}async function qe(e,t){let s=e.find(a=>a.id===t),{events:r}=await f.storeEvents(s.id);X(s.name,n`<dl class="grid grid-cols-[7rem_1fr] gap-1 text-sm">
    <dt class="text-slate-500">公式店舗ID</dt><dd>${s.officialId??k}</dd><dt class="text-slate-500">店舗種別</dt><dd>${s.brandType}（${ae[s.brandGroup]}）</dd>
    <dt class="text-slate-500">所在地</dt><dd>${s.address}</dd><dt class="text-slate-500">状態</dt><dd>${s.status}</dd>
    <dt class="text-slate-500">後継店舗</dt><dd>${s.successorStoreId?e.find(a=>a.id===s.successorStoreId)?.name??k:"\u306A\u3057"}</dd>
    <dt class="text-slate-500">確認日時</dt><dd>${P(s.verifiedAt)}</dd>
    <dt class="text-slate-500">備考</dt><dd>${s.note??"\u306A\u3057"}</dd><dt class="text-slate-500">取得元</dt><dd class="text-xs">${s.source}</dd></dl>
    <h3 class="mt-4 mb-1 font-semibold">変更履歴</h3><ul class="text-sm">${r.map(a=>n`<li class="border-t border-slate-100 py-1">
      <span class="text-xs text-slate-500">${P(a.occurredAt)}</span> ${{open:"\u767B\u9332",close:"\u9589\u5E97",move:"\u79FB\u8EE2",rename:"\u6539\u79F0",verify:"\u78BA\u8A8D",update:"\u66F4\u65B0"}[a.eventType]}
      <span class="text-xs text-slate-500">${a.after?JSON.stringify(a.after):""}</span></li>`)}</ul>`)}var Ge=e=>e.officialUrl?n`<a class="text-xs text-sky-700 underline" href="${e.officialUrl}" target="_blank" rel="noopener noreferrer">公式ページ</a>`:"",Me=e=>n`<button type="button" class="text-xs text-slate-500 underline" data-store-info="${e.id}">店舗情報</button>`;function Ve(e,t){return n`<tr class="cursor-pointer border-t border-slate-100 hover:bg-amber-50/40" data-store="${e.id}" data-testid="store-row">
    <td class="p-2"><div class="font-medium">${e.name}</div><div class="text-[11px] text-slate-500">${e.brandType}（${ae[e.brandGroup]}）</div></td>
    <td class="p-2 text-xs">${e.address}</td>
    <td class="p-2"><span class="rounded px-1.5 py-0.5 text-[11px] ${Oe(e.status)}">${e.status}</span></td>
    <td class="p-2 text-right tabular-nums"><b class="${t.profitableInStock?"text-emerald-700":"text-slate-400"}">${t.profitableInStock}</b> ／ ${t.profitable}
      ${t.profitableStale?n`<div class="text-[11px] font-semibold text-orange-700" data-testid="store-stale">要再確認 ${t.profitableStale}</div>`:""}
      ${t.profitableUnconfirmed?n`<div class="text-[11px] text-amber-700">未確認 ${t.profitableUnconfirmed}</div>`:""}</td>
    <td class="p-2 text-right tabular-nums ${t.premiumBoth?"font-bold text-rose-700":"text-slate-400"}">${t.premiumBoth}</td>
    <td class="p-2 text-right font-semibold tabular-nums ${t.profitSumInStock>0?"text-emerald-600":"text-slate-400"}" data-testid="store-profit">${t.profitSumInStock>0?I(t.profitSumInStock):"\xA50"}</td>
    <td class="p-2 text-xs text-slate-500 whitespace-nowrap">${P(t.lastCheckedAt)}</td>
    <td class="p-2 whitespace-nowrap"><span class="text-xs font-semibold text-sky-700">商品を見る →</span><div class="mt-1 flex gap-2">${Me(e)}${Ge(e)}</div></td></tr>`}function Je(e,t){return n`<div class="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50" data-store="${e.id}" data-testid="store-card">
    <div class="flex items-start justify-between gap-2"><div class="font-medium">${e.name}</div>
      <span class="rounded px-1.5 py-0.5 text-[11px] ${Oe(e.status)}">${e.status}</span></div>
    <div class="text-xs text-slate-500">${e.address}</div>
    <div class="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
      <div class="rounded bg-emerald-50 p-2"><div class="text-[11px] text-slate-500">利益商品</div><div class="font-bold tabular-nums">${t.profitableInStock}<span class="text-xs font-normal text-slate-500">／${t.profitable}</span></div><div class="text-[10px] text-slate-500">確認済／全件</div>${t.profitableStale?n`<div class="text-[10px] font-semibold text-orange-700">要再確認 ${t.profitableStale}</div>`:""}</div>
      <div class="rounded bg-rose-50 p-2"><div class="text-[11px] text-slate-500">両方定価超え</div><div class="font-bold tabular-nums">${t.premiumBoth}</div></div>
      <div class="rounded bg-slate-50 p-2"><div class="text-[11px] text-slate-500">想定利益合計</div><div class="font-bold tabular-nums ${t.profitSumInStock>0?"text-emerald-600":"text-slate-400"}">${t.profitSumInStock>0?I(t.profitSumInStock):"\xA50"}</div></div>
    </div>
    <div class="mt-2 flex items-center justify-between text-xs"><span class="text-slate-400">最終在庫確認 ${P(t.lastCheckedAt)}</span>
      <span class="flex gap-3">${Me(e)}<span class="font-semibold text-sky-700">商品を見る →</span></span></div></div>`}var We=[{kind:"products",title:"BOOKOFF \u5546\u54C1\u30FB\u5728\u5EAB\u30FB\u4FA1\u683C",desc:n`列：商品名, JAN, ISBN, カテゴリ, 定価, 画像URL, 店舗ID（shop番号）または店舗名, BOOKOFF価格, 在庫状態, 商品状態, 在庫確認日時, 情報取得元。<br>在庫確認日時が空の行は「在庫未確認」として登録します。`},{kind:"market",title:"\u8CA9\u58F2\u76F8\u5834\uFF08\u30E1\u30EB\u30AB\u30EA\u30FBYahoo!\u30D5\u30EA\u30DE\u30FBAmazon\u4E2D\u53E4\uFF09",desc:n`列：商品名, JAN, ISBN, 販路（メルカリ／Yahoo!フリマ／Amazon中古）, 価格種別（出品価格／売却済み価格／推定相場）, 価格, サンプル数, 取得日時, 情報取得元, 備考。<br>Yahoo!オークション・Yahoo!ショッピングの行は拒否します。`},{kind:"stores",title:"\u5E97\u8217\u30DE\u30B9\u30BF\uFF08\u9589\u5E97\u30FB\u79FB\u8EE2\u30FB\u6539\u79F0\u306E\u53CD\u6620\uFF09",desc:n`列：公式店舗ID, 店舗名, 都道府県, 所在地, 店舗種別, 公式URL, 状態（営業中／閉店／移転／改称／要確認）, 後継店舗ID, 確認日時, 備考。<br>静岡県・山梨県・神奈川県以外は拒否します。`}];function Ze(e,t){return n`<div class="mt-3 rounded-lg ${e.errors.length?"bg-amber-50":"bg-emerald-50"} p-3 text-sm" data-testid="import-result">
    <div>${e.total}行を処理（${t}）：追加 <b>${e.inserted}</b>・更新 <b>${e.updated}</b>・スキップ <b>${e.skipped}</b>・エラー <b>${e.errors.length}</b></div>
    ${e.estimates?n`<div class="mt-1 text-xs text-slate-600" data-testid="import-estimates">売却済み価格から推定相場を自動算出：${e.estimates.saved}件（直近${e.estimates.days}日の中央値）</div>`:""}
    ${e.errors.length?n`<ul class="mt-2 max-h-48 list-disc overflow-auto pl-5 text-xs text-red-700">${e.errors.map(s=>n`<li>${s.line}行目：${s.message}</li>`)}</ul>`:""}</div>`}function Xe(e){let t=e.result,s=r=>r?Object.entries(r).filter(([,a])=>a!=null).map(([a,o])=>`${{name:"\u5E97\u8217\u540D",address:"\u6240\u5728\u5730",status:"\u72B6\u614B"}[a]??a}\uFF1A${o}`).join("\u3001"):"";return n`<div class="mt-2 rounded-lg border border-slate-200 bg-white p-3" data-testid="store-diff">
    <div class="text-sm">${t.total}行を照合：追加 <b>${e.changes.filter(r=>r.action==="inserted").length}</b>・変更 <b>${e.changes.filter(r=>r.action==="updated").length}</b>・変更なし ${t.skipped-t.errors.length}・エラー ${t.errors.length}・<span class="text-orange-700">CSVに無い営業中の店舗 <b>${e.missing.length}</b></span>（まだ保存していません）</div>
    ${e.changes.length?n`<ul class="mt-2 max-h-48 list-disc overflow-auto pl-5 text-xs">${e.changes.map(r=>n`<li>${r.line}行目 ${r.action==="inserted"?"\u3010\u8FFD\u52A0\u3011":"\u3010\u5909\u66F4\u3011"}${r.officialId??""} ${r.name}${r.action==="updated"?n`：${s(r.before)} → ${s(r.after)}`:""}</li>`)}</ul>`:""}
    ${e.missing.length?n`<div class="mt-2 text-xs font-semibold text-orange-700">CSVに無い店舗（閉店なら「状態」を閉店にした行をCSVに加えて取り込む）</div>
      <ul class="max-h-48 list-disc overflow-auto pl-5 text-xs" data-testid="store-diff-missing">${e.missing.map(r=>n`<li>${r.officialId??""} ${r.name}（${r.prefecture}）</li>`)}</ul>`:""}
    ${t.errors.length?n`<ul class="mt-2 list-disc pl-5 text-xs text-red-700">${t.errors.map(r=>n`<li>${r.line}行目：${r.message}</li>`)}</ul>`:""}</div>`}function Qe(e){return e.length?n`<div class="space-y-3">${e.map(t=>{let s=[...t.products].sort((r,a)=>a.offers+a.prices-(r.offers+r.prices)||r.createdAt.localeCompare(a.createdAt));return n`<div class="rounded-lg border border-slate-200 p-3 text-sm" data-testid="dup-group">
      <div class="mb-1 text-xs text-slate-500">コード ${t.code}${t.isDemo?"\uFF08\u30C7\u30E2\uFF09":""}</div>
      <ul class="space-y-1">${s.map(r=>n`<li class="flex flex-wrap items-center gap-2">
        <button type="button" class="text-left underline" data-detail="${r.id}">ID ${r.id}：${r.name}</button><span class="text-xs text-slate-500">在庫${r.offers}・相場${r.prices}</span>
        <button class="btn-secondary !py-0.5 text-xs" data-merge="${r.id}" data-others="${s.filter(a=>a.id!==r.id).map(a=>a.id).join(",")}">この商品に統合</button></li>`)}</ul></div>`})}</div>`:n`<p class="text-sm text-emerald-700" data-testid="dups-empty">重複している商品はありません。</p>`}function ce(e,t,s){$(e,n`<div class="grid gap-4 lg:grid-cols-2">
    ${We.map(a=>z(a.title,n`<p class="text-xs leading-relaxed text-slate-600">${a.desc}</p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <input type="file" accept=".csv,text/csv" data-import="${a.kind}" class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white" aria-label="${a.title} CSVファイル">
        <a class="text-sm text-sky-700 underline" href="/api/templates/${a.kind}.csv">テンプレートCSV</a></div>
      ${a.kind==="stores"?n`<div class="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <b>定期見直し：</b>公式の店舗一覧から作ったCSVを「差分だけ確認」で照合すると、保存せずに追加・変更される店舗と、CSVに無い営業中の店舗（閉店・改称の候補）を表示します。確認してから上の欄で取り込んでください。
        <label class="mt-2 block"><span class="lbl">差分だけ確認（保存しません）</span>
        <input type="file" accept=".csv,text/csv" id="store-diff" class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-600 file:px-3 file:py-2 file:text-white" aria-label="店舗マスタ 差分確認CSVファイル"></label>
        <div id="store-diff-result"></div></div>`:""}
      <div data-result="${a.kind}"></div>`))}
    ${z("\u91CD\u8907\u5546\u54C1\u306E\u7D71\u5408",n`<p class="text-sm text-slate-600">JAN・ISBNが同じ商品（書籍はISBN-13とJANを同一視、ISBN-10も変換して比較）を表示します。統合すると在庫・相場を1つの商品にまとめ、空欄の項目を補います。同じ店舗の在庫は確認日時が新しい方を残します。</p>
      <div class="mt-3" id="dups" data-testid="dups"></div>`)}
    ${z("CSV\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8",n`<p class="text-sm text-slate-600">一覧画面の現在の絞り込み条件で出力するには、一覧の「CSVエクスポート」を使います。ここからは全件を出力します（Excelで開けるBOM付きUTF-8）。</p>
      <div class="mt-3 flex flex-wrap gap-2"><a class="btn-secondary" href="/api/export.csv">全件をCSVで出力</a>
      <a class="btn-secondary" href="/api/export.csv?dataKind=real">実データのみ出力</a></div>`)}
    ${z("\u30C7\u30E2\u30C7\u30FC\u30BF",n`<p class="text-sm text-slate-600">現在のデモ：商品 ${t.counts.demo.products}件・在庫 ${t.counts.demo.offers}件・相場 ${t.counts.demo.prices}件。デモは架空の価格で、一覧では「デモ」バッジが付きます。</p>
      <div class="mt-3 flex gap-2"><button class="btn-secondary" id="demo-add">デモを投入</button><button class="btn-danger" id="demo-del">デモを全削除</button></div>`)}
  </div>`),C("[data-import]",e).forEach(a=>a.addEventListener("change",async()=>{let o=a.files?.[0];if(!o)return;let i=a.dataset.import,{text:b,encoding:d}=de(new Uint8Array(await o.arrayBuffer()));try{let l=await f.importCsv(i,b,o.name);$(c(`[data-result="${i}"]`,e),Ze(l,d==="utf-8"?"UTF-8":"Shift_JIS")),m("\u53D6\u308A\u8FBC\u307F\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F"),s()}catch(l){m(l.message,"error")}a.value=""})),c("#store-diff",e).addEventListener("change",async a=>{let o=a.target,i=o.files?.[0];if(!i)return;let{text:b}=de(new Uint8Array(await i.arrayBuffer()));try{$(c("#store-diff-result",e),Xe(await f.diffStores(b,i.name)))}catch(d){m(d.message,"error")}o.value=""});let r=async()=>{let a=c("#dups",e),{groups:o}=await f.duplicates();$(a,Qe(o))};c("#dups",e).addEventListener("click",async a=>{let o=a.target.closest("[data-detail]");if(o){U(Number(o.dataset.detail),t,()=>{r()});return}let i=a.target.closest("[data-merge]");if(!i)return;let b=Number(i.dataset.merge),d=(i.dataset.others??"").split(",").map(Number).filter(Boolean);if(confirm(`\u5546\u54C1ID ${d.join("\u30FB")} \u3092 ID ${b} \u306B\u7D71\u5408\u3057\u307E\u3059\u3002\u5143\u306B\u623B\u305B\u307E\u305B\u3093\u3002\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F`))try{await f.mergeProducts(b,d),m("\u7D71\u5408\u3057\u307E\u3057\u305F"),s(),await r()}catch(l){m(l.message,"error")}}),r().catch(a=>m(a.message,"error")),c("#demo-add",e).addEventListener("click",async()=>{await f.seedDemo(),m("\u30C7\u30E2\u30C7\u30FC\u30BF\u3092\u6295\u5165\u3057\u307E\u3057\u305F"),s(!0)}),c("#demo-del",e).addEventListener("click",async()=>{confirm("\u30C7\u30E2\u30C7\u30FC\u30BF\uFF08\u67B6\u7A7A\u306E\u5546\u54C1\u30FB\u5728\u5EAB\u30FB\u76F8\u5834\uFF09\u3092\u3059\u3079\u3066\u524A\u9664\u3057\u307E\u3059\u3002\u5B9F\u30C7\u30FC\u30BF\u306F\u524A\u9664\u3055\u308C\u307E\u305B\u3093\u3002\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F")&&(await f.deleteDemo(),m("\u30C7\u30E2\u30C7\u30FC\u30BF\u3092\u524A\u9664\u3057\u307E\u3057\u305F"),s(!0))})}var et={accounts:"\u30E6\u30FC\u30B6\u30FC\u5225\u306E\u30ED\u30B0\u30A4\u30F3\uFF08\u30E6\u30FC\u30B6\u30FC\u540D\u3068\u30D1\u30B9\u30EF\u30FC\u30C9\uFF09",password:"\u5171\u6709\u30D1\u30B9\u30EF\u30FC\u30C9\uFF08APP_PASSWORD\uFF09\u3002\u30E6\u30FC\u30B6\u30FC\u3092\u4F5C\u308B\u3068\u3001\u30E6\u30FC\u30B6\u30FC\u5225\u306E\u30ED\u30B0\u30A4\u30F3\u306B\u5207\u308A\u66FF\u308F\u308A\u307E\u3059",none:"\u30ED\u30B0\u30A4\u30F3\u306A\u3057\uFF08\u540C\u3058Wi-Fi\u306E\u4EBA\u306F\u8AB0\u3067\u3082\u958B\u3051\u307E\u3059\uFF09\u3002\u30E6\u30FC\u30B6\u30FC\u3092\u4F5C\u308B\u3068\u3001\u30E6\u30FC\u30B6\u30FC\u5225\u306E\u30ED\u30B0\u30A4\u30F3\u306B\u5207\u308A\u66FF\u308F\u308A\u307E\u3059"};async function Ae(e,t){let{users:s,authMode:r}=await f.users(),a=document.createElement("div");e.replaceChildren(a);let o=s.length===0,i=d=>n`<tr class="border-t border-slate-100" data-testid="user-row" data-user="${d.id}">
    <td class="p-2 font-medium">${d.username}${d.username===t.username?n` <span class="text-xs text-slate-500">（あなた）</span>`:""}</td>
    <td class="p-2"><select class="inp !w-auto !py-1" data-role="${d.id}" aria-label="${d.username} の権限">${E(ne,d.role,V)}</select></td>
    <td class="p-2 text-xs text-slate-500 whitespace-nowrap">${P(d.lastLoginAt)}</td>
    <td class="p-2 whitespace-nowrap"><button type="button" class="text-xs text-sky-700 underline" data-pw="${d.id}">パスワード変更</button>
      <button type="button" class="ml-2 text-xs text-red-600 underline" data-del="${d.id}">削除</button></td></tr>`;$(a,z("\u30E6\u30FC\u30B6\u30FC",n`
    <p class="mb-2 text-sm">今のログイン方式：<b data-testid="auth-mode">${et[r]}</b></p>
    <p class="mb-3 text-xs text-slate-500">権限：管理者＝すべて（ユーザー・設定・店舗マスタ・デモ）／編集者＝商品・在庫・相場の登録、CSV取込、自動取得／閲覧のみ＝見る・CSV出力だけ。
      ${t.https?"":n`<b class="text-amber-700">今は暗号化なし（HTTP）です。インターネットに公開するときはHTTPSにしてください（TLS_CERT_FILE・TLS_KEY_FILE）。</b>`}</p>
    ${s.length?n`<div class="mb-3 overflow-x-auto"><table class="w-full text-sm" data-testid="users-table"><thead class="text-left text-xs text-slate-500"><tr><th class="p-2">ユーザー名</th><th class="p-2">権限</th><th class="p-2">最終ログイン</th><th class="p-2"></th></tr></thead>
      <tbody>${s.map(i)}</tbody></table></div>`:""}
    <form id="user-form" class="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <label><span class="lbl">ユーザー名</span><input class="inp" name="username" required maxlength="40" autocomplete="off"></label>
      <label><span class="lbl">パスワード（8文字以上）</span><input class="inp" name="password" type="password" required minlength="8" autocomplete="new-password"></label>
      <label><span class="lbl">権限</span><select class="inp" name="role" ${o?A("disabled"):""}>${E(ne,o?"admin":"editor",V)}</select></label>
      <button class="btn-primary">${o?"\u6700\u521D\u306E\u7BA1\u7406\u8005\u3092\u4F5C\u308B":"\u30E6\u30FC\u30B6\u30FC\u3092\u8FFD\u52A0"}</button>
    </form>
    ${o?n`<p class="mt-2 text-xs text-amber-700">作った直後から、開くときにこのユーザー名とパスワードを聞かれます。忘れないよう控えてください。</p>`:""}`));let b=()=>Ae(e,t);c("#user-form",a).addEventListener("submit",async d=>{d.preventDefault();let l=new FormData(d.target);try{if(await f.createUser({username:String(l.get("username")),password:String(l.get("password")),role:o?"admin":String(l.get("role"))}),o){m("\u7BA1\u7406\u8005\u3092\u4F5C\u308A\u307E\u3057\u305F\u3002\u30E6\u30FC\u30B6\u30FC\u540D\u3068\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044"),setTimeout(()=>location.reload(),800);return}m("\u30E6\u30FC\u30B6\u30FC\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F"),await b()}catch(p){m(p.message,"error")}}),C("[data-role]",a).forEach(d=>d.addEventListener("change",async()=>{try{await f.updateUser(Number(d.dataset.role),{role:d.value}),m("\u6A29\u9650\u3092\u5909\u66F4\u3057\u307E\u3057\u305F")}catch(l){m(l.message,"error")}await b()})),a.addEventListener("click",async d=>{let l=d.target,p=l.closest("[data-pw]"),g=l.closest("[data-del]");if(p){let h=prompt("\u65B0\u3057\u3044\u30D1\u30B9\u30EF\u30FC\u30C9\uFF088\u6587\u5B57\u4EE5\u4E0A\uFF09");if(!h)return;try{await f.updateUser(Number(p.dataset.pw),{password:h}),m("\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5909\u66F4\u3057\u307E\u3057\u305F")}catch(w){m(w.message,"error")}}if(g){let h=s.find(w=>w.id===Number(g.dataset.del));if(!confirm(`${h.username} \u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F`))return;try{let w=await f.deleteUser(h.id);m(w.authMode==="accounts"?"\u30E6\u30FC\u30B6\u30FC\u3092\u524A\u9664\u3057\u307E\u3057\u305F":"\u30E6\u30FC\u30B6\u30FC\u304C\u3044\u306A\u304F\u306A\u3063\u305F\u305F\u3081\u3001\u30E6\u30FC\u30B6\u30FC\u5225\u306E\u30ED\u30B0\u30A4\u30F3\u3092\u89E3\u9664\u3057\u307E\u3057\u305F"),await b()}catch(w){m(w.message,"error")}}})}async function Re(e,t){let s=await f.settings(),r=t.role==="admin",a=l=>n`<fieldset class="rounded-lg border border-slate-200 p-3"><legend class="px-1 font-semibold">${R[l]}</legend>
    <div class="grid grid-cols-2 gap-2">
      <label><span class="lbl">販売手数料率（%）</span><input class="inp" name="${l}.fee" type="number" min="0" max="100" step="0.01" required value="${s.marketplaces[l].feeRatePercent}"></label>
      <label><span class="lbl">送料（円）</span><input class="inp" name="${l}.ship" type="number" min="0" step="1" required value="${s.marketplaces[l].shipping}"></label>
    </div>
    ${l==="amazon_used"?n`<details class="mt-3" open><summary class="cursor-pointer text-sm font-medium">カテゴリー別の手数料（空欄＝基本料率）</summary>
      <div class="mt-2 overflow-x-auto"><table class="w-full text-sm"><thead class="text-left text-xs text-slate-500"><tr><th class="p-1">カテゴリー</th><th class="p-1">料率%</th><th class="p-1">成約料（円）</th><th class="p-1">最低手数料（円）</th></tr></thead>
      <tbody>${re.map(p=>{let g=s.marketplaces.amazon_used.categoryFees?.[p]??{};return n`<tr><td class="p-1 whitespace-nowrap">${p}</td>
        <td class="p-1"><input class="inp !py-1" name="amz.${p}.rate" type="number" min="0" max="100" step="0.1" value="${g.feeRatePercent??""}" aria-label="${p} 料率"></td>
        <td class="p-1"><input class="inp !py-1" name="amz.${p}.fixed" type="number" min="0" step="1" value="${g.fixedFee??""}" aria-label="${p} 成約料"></td>
        <td class="p-1"><input class="inp !py-1" name="amz.${p}.min" type="number" min="0" step="1" value="${g.minFee??""}" aria-label="${p} 最低手数料"></td></tr>`})}</tbody></table></div>
      <p class="mt-1 text-xs text-slate-500">初期値：メディア（本・CD・DVD）15%・最低手数料なし＋成約料（本80円、CD・DVD140円）。その他は保守的に15%・最低30円（家電は実際8〜10%のことが多いので要調整）。</p></details>`:""}
    </fieldset>`,o=l=>n`<select class="inp" name="prio${l}" aria-label="優先順位${l+1}">${E(["estimate","sold","listing"],s.priceTypePriority[l],B,l===0?void 0:"\uFF08\u4F7F\u308F\u306A\u3044\uFF09")}</select>`;$(e,n`<form id="settings-form" class="grid gap-4 lg:grid-cols-2">
    ${z("\u8CA9\u8DEF\u5225\u306E\u624B\u6570\u6599\u30FB\u9001\u6599",n`<div class="space-y-3">${M.map(a)}</div>
      <p class="mt-2 text-xs text-slate-500">初期値はメルカリ10%・Yahoo!フリマ5%・Amazon中古15%（2026年11月時点の公開情報）。送料は自己発送の想定値です。FBAを使う場合は配送代行手数料を送料に入れてください。</p>`)}
    ${z("\u5171\u901A\u8CBB\u7528\u30FB\u8A08\u7B97\u65B9\u6CD5",n`<div class="space-y-3">
      <label class="block"><span class="lbl">その他費用（円／1点）</span><input class="inp" name="other" type="number" min="0" step="1" value="${s.otherCost}"></label>
      <div><span class="lbl">想定販売価格に使う相場の優先順位</span><div class="grid grid-cols-3 gap-2">${o(0)}${o(1)}${o(2)}</div></div>
      <label class="block"><span class="lbl">在庫確認の有効日数（これを過ぎた「在庫あり」は「要再確認」。0で無効）</span>
        <input class="inp" name="stockFreshDays" type="number" min="0" max="365" step="1" value="${s.stockFreshDays}"></label>
      <label class="block"><span class="lbl">推定相場の自動算出：売却済み価格の期間（直近N日の中央値。0で自動算出しない）</span>
        <input class="inp" name="estimateDays" type="number" min="0" max="3650" step="1" value="${s.estimateDays}"></label>
      <label class="block"><span class="lbl">手数料の端数処理</span><select class="inp" name="rounding">${E(["floor","round","ceil"],s.rounding,{floor:"\u5207\u308A\u6368\u3066",round:"\u56DB\u6368\u4E94\u5165",ceil:"\u5207\u308A\u4E0A\u3052"})}</select></label>
      <div class="rounded-lg bg-slate-50 p-3 text-sm" id="preview"></div>
      ${r?n`<button class="btn-primary w-full">設定を保存</button>`:n`<p class="rounded bg-slate-100 p-2 text-sm text-slate-600">設定の変更は管理者だけができます。</p>`}
      ${t.role!=="viewer"?n`<button type="button" class="btn-secondary w-full" id="recompute">推定相場を今すぐ再計算</button>`:""}</div>`)}
  </form>
  ${r?n`<div id="users" class="mt-4"></div>`:""}`),r&&await Ae(c("#users",e),t);let i=c("#settings-form",e),b=()=>{let l=new FormData(i),p=S=>Number(l.get(S)),g=[0,1,2].map(S=>String(l.get(`prio${S}`)??"")).filter(Boolean),h=S=>{let v=String(l.get(S)??"").trim();return v===""?void 0:Number(v)},w={};for(let S of re){let v={feeRatePercent:h(`amz.${S}.rate`),fixedFee:h(`amz.${S}.fixed`),minFee:h(`amz.${S}.min`)};Object.keys(v).forEach(u=>v[u]===void 0&&delete v[u]),Object.keys(v).length&&(w[S]=v)}let O=S=>({...s.marketplaces[S],feeRatePercent:p(`${S}.fee`),shipping:p(`${S}.ship`)});return{marketplaces:{mercari:O("mercari"),yahoo_fleamarket:O("yahoo_fleamarket"),amazon_used:{...O("amazon_used"),categoryFees:w}},stockFreshDays:p("stockFreshDays"),estimateDays:p("estimateDays"),otherCost:p("other"),priceTypePriority:[...new Set(g)],rounding:l.get("rounding")}},d=()=>{let l=b(),p=g=>{let h=Z(l.marketplaces[g],"\u672C"),w=ie({salePrice:2e3,purchasePrice:500,...h,shipping:l.marketplaces[g].shipping,otherCost:l.otherCost,rounding:l.rounding});return n`<div>${R[g]}：手数料 ${T(w?.fee)}、利益 <b class="${(w?.profit??0)>=0?"text-emerald-600":"text-red-600"}">${T(w?.profit)}</b>（${w?.marginPercent??k}%）</div>`};$(c("#preview",e),n`<div class="mb-1 text-xs text-slate-500">計算例：本を¥500で仕入れ、¥2,000で販売</div>${M.map(p)}`)};i.addEventListener("input",d),c("#recompute",e)?.addEventListener("click",async()=>{try{let l=await f.recomputeEstimates();m(`\u63A8\u5B9A\u76F8\u5834\u3092${l.saved}\u4EF6\u7B97\u51FA\u3057\u307E\u3057\u305F\uFF08\u76F4\u8FD1${l.days}\u65E5\u306E\u58F2\u5374\u6E08\u307F\u4FA1\u683C\u306E\u4E2D\u592E\u5024\u30FB\u5B9F\u30C7\u30FC\u30BF\u306E\u307F\uFF09`)}catch(l){m(l.message,"error")}}),i.addEventListener("submit",async l=>{l.preventDefault();try{await f.saveSettings(b()),m("\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u5229\u76CA\u306F\u518D\u8A08\u7B97\u3055\u308C\u307E\u3059")}catch(p){m(p.message,"error")}}),d()}async function Ce(e){let{providers:t}=await f.providers(),s=(a,o,i)=>a==="implemented"&&i==="api"&&!o?n`<span class="whitespace-nowrap rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">実装済み・要APIキー</span>`:a==="implemented"?n`<span class="whitespace-nowrap rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">実装済み</span>`:n`<span class="whitespace-nowrap rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">未実装</span>`,r={csv:"CSV\u53D6\u8FBC",manual:"\u624B\u52D5\u767B\u9332",api:"\u81EA\u52D5\u53D6\u5F97",snapshot:"\u516C\u5F0F\u4E00\u89A7\u306E\u8A18\u9332"};$(e,n`
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
    <p class="mt-3 text-xs text-slate-500">詳しい調査結果は docs/data-sources.md を参照。Providerを実装すると、この画面の状態が自動で切り替わります。</p>`),e.addEventListener("click",async a=>{let o=a.target.closest("[data-bulk]");if(o){o.disabled=!0;try{let b=await f.runBulk(o.dataset.bulk);m(`${b.requested}\u4EF6\u3092\u7167\u4F1A\u3001${b.matched}\u4EF6\u53D6\u5F97\u3001\u76F8\u5834${b.inserted}\u4EF6\u30FB\u5B9A\u4FA1${b.listPricesSet}\u4EF6\u3092\u4FDD\u5B58`)}catch(b){m(b.message,"error")}o.disabled=!1;return}let i=a.target.closest("[data-run]");if(i)try{await f.runProvider(i.dataset.run),m("\u53D6\u5F97\u3057\u307E\u3057\u305F")}catch(b){m(b.message,"error")}})}var pe=[{path:"/",label:"\u5229\u76CA\u5546\u54C1\u4E00\u89A7",short:"\u4E00\u89A7"},{path:"/check",label:"\u78BA\u8A8D\u5F85\u3061",short:"\u78BA\u8A8D\u5F85\u3061"},{path:"/stores",label:"\u5E97\u8217\u30DE\u30B9\u30BF",short:"\u5E97\u8217"},{path:"/import",label:"\u53D6\u8FBC\u30FB\u51FA\u529B",short:"\u53D6\u8FBC"},{path:"/settings",label:"\u8A2D\u5B9A",short:"\u8A2D\u5B9A"},{path:"/sources",label:"\u30C7\u30FC\u30BF\u53D6\u5F97\u5143",short:"\u53D6\u5F97\u5143"}],N,G;function ue(){let e=location.hash.replace(/^#/,"")||"/",[t,s]=e.split("?");return{path:t||"/",query:new URLSearchParams(s??"")}}function tt(){$(document.body,n`
    <header class="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white">
      <div class="mx-auto flex max-w-[1400px] items-center gap-3 px-3 py-2 sm:px-4">
        <a href="#/" class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg bg-amber-400 text-slate-900">¥</span>
          <span class="leading-tight">BOOKOFF利益商品検索<span class="block text-[10px] font-normal text-slate-300">静岡・山梨・神奈川</span></span></a>
        <nav class="ml-auto hidden md:flex gap-1" aria-label="メイン">${pe.map(e=>n`<a href="#${e.path}" data-nav="${e.path}" class="rounded-md px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">${e.label}</a>`)}</nav>
        <span id="whoami" class="ml-auto text-right text-[11px] leading-tight text-slate-300 md:ml-2"></span>
      </div>
    </header>
    <div id="banner"></div>
    <main id="view" class="mx-auto max-w-[1400px] px-3 py-4 pb-24 sm:px-4 md:pb-8"></main>
    <nav class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden" aria-label="メイン（モバイル）">
      ${pe.map(e=>n`<a href="#${e.path}" data-nav="${e.path}" class="px-1 py-2.5 text-center text-[11px] text-slate-600">${e.short}</a>`)}
    </nav>`)}function st(){let e=N.counts.demo,t=c("#banner");if(e.products===0){$(t,n``);return}$(t,n`<div class="border-b border-violet-200 bg-violet-50" data-testid="demo-banner"><div class="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-3 py-2 text-sm text-violet-900 sm:px-4">
    <span class="rounded bg-violet-600 px-1.5 py-0.5 text-xs font-bold text-white">デモ</span>
    <span>架空のデモデータ ${e.products}件を含みます。価格・在庫は実在しません（実データ ${N.counts.real.products}件）。</span>
    <a href="#/import" class="ml-auto underline">デモの削除・CSV取込へ</a></div></div>`)}function at(){let e=c("#whoami");if(G.authMode!=="accounts"){$(e,n``);return}$(e,n`<span data-testid="whoami">${G.username}<span class="block">${V[G.role]}</span></span>`)}async function se(){[N,G]=await Promise.all([f.meta(),f.me()]),st(),at(),G.role==="viewer"&&c("#banner").insertAdjacentHTML("beforeend",n`<div class="border-b border-sky-200 bg-sky-50 px-3 py-1.5 text-center text-xs text-sky-900" data-testid="viewer-banner">閲覧のみの権限です。登録・取込・削除はできません（CSV出力はできます）。</div>`.value)}async function Fe(){let{path:e,query:t}=ue();document.querySelectorAll("[data-nav]").forEach(a=>{let o=a.dataset.nav===e;a.classList.toggle("!bg-slate-800",o&&!!a.closest("header")),a.classList.toggle("!text-amber-600",o&&!a.closest("header")),a.classList.toggle("font-semibold",o),o?a.setAttribute("aria-current","page"):a.removeAttribute("aria-current")});let s=c("#view"),r=pe.find(a=>a.path===e)?.label??"\u5229\u76CA\u5546\u54C1\u4E00\u89A7";document.title=`${r}\uFF5CBOOKOFF\u5229\u76CA\u5546\u54C1\u691C\u7D22`;try{e==="/check"?await Le(s,N):e==="/stores"?await Pe(s,N):e==="/import"?ce(s,N,async a=>{await se(),a&&ce(s,N,()=>se())}):e==="/settings"?await Re(s,G):e==="/sources"?await Ce(s):await Te(s,N,t)}catch(a){m(a.message,"error")}}async function rt(){tt();try{await se()}catch(t){m(`\u8D77\u52D5\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF1A${t.message}`,"error");return}let e=ue().path;window.addEventListener("hashchange",()=>{let t=ue().path;(t!==e||t!=="/")&&(e=t,se().then(Fe))}),await Fe()}rt();
//# sourceMappingURL=app.js.map
