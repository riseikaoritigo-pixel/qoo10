const CODE_HEADERS=['商品番号','商品コード','商品管理番号','管理番号','jan','janコード','jancode','sku','itemcode','itemnumber','productcode','productnumber'];
const COST_HEADERS=['成本','商品成本','原価','仕入価格','仕入値','仕入単価','仕入れ価格','cost','productcost','unitcost'];

export const normalizeProductNumber=value=>String(value??'').trim().replace(/[\u3000]/g,' ');
const normalizeHeader=value=>String(value??'').trim().toLowerCase().replace(/[\s\u3000_\-‐‑–—()（）［］\[\]\/]/g,'');
const headerMatches=(value,names)=>{const key=normalizeHeader(value);return names.some(name=>{const target=normalizeHeader(name);return key===target||key.includes(target)})};
const parseCost=value=>{
  if(typeof value==='number')return Number.isFinite(value)?value:NaN;
  const cleaned=String(value??'').trim().replace(/[，,\s\u3000￥¥円]/g,'');
  if(!cleaned)return NaN;
  const parsed=Number(cleaned);
  return Number.isFinite(parsed)?parsed:NaN;
};

export function parseCatalogRows(rows){
  if(!Array.isArray(rows)||!rows.length)throw new Error('表格没有可读取的数据');
  let headerRow=-1,codeColumn=-1,costColumn=-1;
  const scanLength=Math.min(rows.length,20);
  for(let r=0;r<scanLength;r++){
    const row=Array.isArray(rows[r])?rows[r]:[];
    const code=row.findIndex(cell=>headerMatches(cell,CODE_HEADERS));
    const cost=row.findIndex(cell=>headerMatches(cell,COST_HEADERS));
    if(code>=0&&cost>=0){headerRow=r;codeColumn=code;costColumn=cost;break}
  }
  if(headerRow<0)throw new Error('未找到“商品番号”和“成本／原価”两列');
  const map=new Map();let duplicates=0,invalidRows=0;
  for(let r=headerRow+1;r<rows.length;r++){
    const row=Array.isArray(rows[r])?rows[r]:[];
    const productNumber=normalizeProductNumber(row[codeColumn]);
    const cost=parseCost(row[costColumn]);
    if(!productNumber&&!String(row[costColumn]??'').trim())continue;
    if(!productNumber||!Number.isFinite(cost)||cost<0){invalidRows++;continue}
    if(map.has(productNumber))duplicates++;
    map.set(productNumber,cost);
  }
  if(!map.size)throw new Error('没有找到有效的商品番号与成本数据');
  return{items:[...map].map(([productNumber,cost])=>({productNumber,cost})),duplicates,invalidRows,headerRow,codeColumn,costColumn};
}

function detectDelimiter(text){
  const line=String(text).split(/\r?\n/,1)[0]||'';
  const candidates=[',','\t',';'];let best=',',count=-1;
  for(const candidate of candidates){const current=line.split(candidate).length-1;if(current>count){best=candidate;count=current}}
  return best;
}

export function parseDelimitedRows(text){
  const source=String(text??'').replace(/^\uFEFF/,'');
  const delimiter=detectDelimiter(source),rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<source.length;i++){
    const char=source[i];
    if(quoted){
      if(char==='"'&&source[i+1]==='"'){cell+='"';i++}
      else if(char==='"')quoted=false;
      else cell+=char;
    }else if(char==='"')quoted=true;
    else if(char===delimiter){row.push(cell);cell=''}
    else if(char==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}
    else cell+=char;
  }
  if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row)}
  return rows;
}

const csvCell=value=>{const text=String(value??'');return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text};
export function resultsToCsv(records){
  const headers=['商品番号','成本','计算方式','运费','目标利润','建议售价','计算时间'];
  const rows=records.map(record=>[record.productNumber,record.productCost,record.mode,record.shippingCost,record.targetProfit,record.suggestedPrice,record.createdAt]);
  return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
