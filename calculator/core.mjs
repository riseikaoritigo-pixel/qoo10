const MAX_PRICE = 1_000_000_000;
export const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const rate = v => num(v) / 100;
const yen = v => Math.round(num(v) + Number.EPSILON);
const tenth = v => Math.round((num(v) + Number.EPSILON) * 10) / 10;
const share = (raw, cap, ratio) => Math.floor(Math.min(num(raw), num(cap)) * num(ratio) + Number.EPSILON);

export function findMinimum(evaluate, target) {
  const wanted = num(target);
  let high = 1;
  while (high < MAX_PRICE && evaluate(high).profit < wanted) high *= 2;
  if (high >= MAX_PRICE && evaluate(MAX_PRICE).profit < wanted) return null;
  let low = 0;
  high = Math.min(high, MAX_PRICE);
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    evaluate(mid).profit >= wanted ? high = mid : low = mid + 1;
  }
  for (let p = Math.max(0, low - 2000); p <= low; p++) if (evaluate(p).profit >= wanted) return p;
  return low;
}

export function megaSaleAt(listPrice, p) {
  const price=Math.max(0,Math.floor(num(listPrice))), shipping=Math.max(0,num(p.customerShipping));
  const raw=price*rate(p.buyerDiscountRate), discount=Math.min(yen(raw),Math.max(0,num(p.discountCap)));
  const buyerPayment=price-discount+shipping, categoryFee=yen((price+shipping)*rate(p.categoryFeeRate));
  const sellerDiscount=share(raw,p.discountCap,rate(p.sellerDiscountShare));
  const systemFee=yen(buyerPayment*rate(p.megaSystemFeeRate)), supportFee=yen(price*rate(p.supportFeeRate));
  const feeTax=Math.floor((categoryFee+systemFee+supportFee)*rate(p.feeTaxRate)+Number.EPSILON);
  const settlement=price+shipping-categoryFee-sellerDiscount-systemFee-supportFee-feeTax;
  return {listPrice:price,discount,buyerPayment,categoryFee,sellerDiscount,systemFee,supportFee,feeTax,settlement,profit:settlement-num(p.productCost)-num(p.sellerShippingCost)};
}

export function megaPoAt(listPrice, p) {
  const price=Math.max(0,Math.floor(num(listPrice))), shipping=Math.max(0,num(p.customerShipping));
  const raw=price*rate(p.couponRate), coupon=Math.min(yen(raw),Math.max(0,num(p.couponCap))), after=price-coupon;
  const buyerPayment=after+shipping, points=Math.min(yen(after*rate(p.pointRate)),Math.max(0,num(p.pointCap)));
  const categoryFee=yen((price+shipping)*rate(p.categoryFeeRate)), sellerCoupon=share(raw,p.couponCap,rate(p.sellerCouponShare));
  const sellerPoints=Math.floor(points*rate(p.sellerPointShare)+Number.EPSILON), feeTax=Math.floor(categoryFee*rate(p.feeTaxRate)+Number.EPSILON);
  const settlement=price+shipping-categoryFee-sellerCoupon-sellerPoints-feeTax;
  return {listPrice:price,coupon,buyerPayment,points,categoryFee,sellerCoupon,sellerPoints,feeTax,settlement,profit:settlement-num(p.productCost)-num(p.sellerShippingCost)};
}

export function normalSaleAt(listPrice,p){
  const price=Math.max(0,Math.floor(num(listPrice)));
  const categoryFee=yen(price*rate(p.categoryFeeRate));
  const feeTax=Math.floor(categoryFee*rate(p.feeTaxRate)+Number.EPSILON);
  const settlement=price-categoryFee-feeTax;
  return {listPrice:price,buyerPayment:price,categoryFee,feeTax,settlement,profit:settlement-num(p.productCost)-num(p.sellerShippingCost)};
}

function strategyAdCost(p){return Math.max(0,num(p.listingFee))/Math.max(1,Math.floor(num(p.expectedOrders)))}
export function megaSaleWithTimeAt(listPrice,p){
  const price=Math.max(0,Math.floor(num(listPrice))),timeDiscount=yen(price*rate(p.timeSaleRate)),timeSalePrice=Math.max(0,price-timeDiscount);
  const raw=timeSalePrice*rate(p.mega.buyerDiscountRate),discount=Math.min(yen(raw),Math.max(0,num(p.mega.discountCap))),buyerPayment=timeSalePrice-discount;
  const categoryFee=yen(price*rate(p.mega.categoryFeeRate)),sellerDiscount=share(raw,p.mega.discountCap,rate(p.mega.sellerDiscountShare));
  const systemFee=yen(buyerPayment*rate(p.mega.megaSystemFeeRate)),supportFee=yen(price*rate(p.mega.supportFeeRate));
  const feeTax=Math.floor((categoryFee+systemFee+supportFee)*rate(p.mega.feeTaxRate)+Number.EPSILON),adCost=strategyAdCost(p);
  const settlement=timeSalePrice-categoryFee-sellerDiscount-systemFee-supportFee-feeTax-adCost;
  return {listPrice:price,timeDiscount,timeSalePrice,discount,buyerPayment,categoryFee,sellerDiscount,systemFee,supportFee,feeTax,adCost,settlement,profit:settlement-num(p.productCost)-num(p.sellerShippingCost)};
}
export function megaPoWithTimeAt(listPrice,p){
  const price=Math.max(0,Math.floor(num(listPrice))),timeDiscount=yen(price*rate(p.timeSaleRate)),timeSalePrice=Math.max(0,price-timeDiscount);
  const raw=timeSalePrice*rate(p.po.couponRate),coupon=Math.min(yen(raw),Math.max(0,num(p.po.couponCap))),after=timeSalePrice-coupon,buyerPayment=after;
  const points=Math.min(yen(after*rate(p.po.pointRate)),Math.max(0,num(p.po.pointCap))),categoryFee=yen(price*rate(p.po.categoryFeeRate));
  const sellerCoupon=share(raw,p.po.couponCap,rate(p.po.sellerCouponShare)),sellerPoints=Math.floor(points*rate(p.po.sellerPointShare)+Number.EPSILON);
  const feeTax=Math.floor(categoryFee*rate(p.po.feeTaxRate)+Number.EPSILON),adCost=strategyAdCost(p);
  const settlement=timeSalePrice-categoryFee-sellerCoupon-sellerPoints-feeTax-adCost;
  return {listPrice:price,timeDiscount,timeSalePrice,coupon,buyerPayment,points,categoryFee,sellerCoupon,sellerPoints,feeTax,adCost,settlement,profit:settlement-num(p.productCost)-num(p.sellerShippingCost)};
}
export function futureSafeAt(listPrice,p){
  const normal=normalSaleAt(listPrice,p),mega=megaSaleWithTimeAt(listPrice,p),po=megaPoWithTimeAt(listPrice,p);
  const scenarios=[['Mega割＋Time Sale',mega],['MegaPo＋Time Sale',po],['正常销售',normal]].sort((a,b)=>a[1].profit-b[1].profit);
  const [worstName,worst]=scenarios[0];
  return {...worst,listPrice:Math.max(0,Math.floor(num(listPrice))),profit:worst.profit,worstName,normal,mega,po};
}

export function timeSaleAt(listPrice, p) {
  const price=Math.max(0,Math.floor(num(listPrice))), optionPrice=Math.max(0,num(p.optionPrice)), shipping=Math.max(0,num(p.customerShipping));
  const discount=p.discountType==='amount'?Math.min(Math.max(0,yen(p.discountAmount)),price):Math.min(yen(price*rate(p.discountRate)),price);
  const salePrice=price-discount, buyerPayment=salePrice+optionPrice+shipping;
  const commissionBase=price+optionPrice+shipping, categoryFee=yen(commissionBase*rate(p.categoryFeeRate));
  const feeTax=Math.floor(categoryFee*rate(p.feeTaxRate)+Number.EPSILON);
  const listingFee=Math.max(0,num(p.listingFee)), expectedOrders=Math.max(1,Math.floor(num(p.expectedOrders))), adCostPerOrder=listingFee/expectedOrders;
  const settlementBeforeAd=buyerPayment-categoryFee-feeTax, settlement=settlementBeforeAd-adCostPerOrder;
  const profit=settlement-num(p.productCost)-num(p.sellerShippingCost), actualDiscountRate=price?discount/price*100:0;
  return {listPrice:price,optionPrice,shipping,discount,salePrice,buyerPayment,commissionBase,categoryFee,feeTax,listingFee,expectedOrders,adCostPerOrder,settlementBeforeAd,settlement,profit,actualDiscountRate,eligible:actualDiscountRate>=1};
}

function rakutenCoupon(price,p){const q=Math.max(1,Math.floor(num(p.quantity)));const v=q===1?yen(price*rate(p.oneItemCouponRate)):num(q===2?p.twoItemCoupon:q===3?p.threeItemCoupon:p.fourItemCoupon);return Math.min(Math.max(0,v),price)}
export function rakutenAt(orderPrice,p){
  const price=Math.max(0,Math.floor(num(orderPrice))),quantity=Math.max(1,Math.floor(num(p.quantity))),coupon=rakutenCoupon(price,p),shipping=Math.max(0,num(p.customerShipping));
  const buyerPayment=price-coupon+shipping,taxExclusive=(price-coupon)/(1+rate(p.productTaxRate)),buyerPoints=Math.floor(taxExclusive/100+Number.EPSILON)*Math.max(0,num(p.pointMultiplier)),taxMul=1+rate(p.feeTaxRate);
  const rmsFee=tenth(buyerPayment*rate(p.rmsRate)*taxMul),payFee=tenth(buyerPayment*rate(p.rakutenPayRate)*taxMul),otherFee=tenth(buyerPayment*(rate(p.safetyRate)+rate(p.otherVariableRate))*taxMul);
  const couponSystemFee=num(p.priorCouponUses)<num(p.couponFeeThreshold)?0:tenth(num(p.couponSystemFeePreTax)*taxMul),totalCost=quantity*num(p.productCostPerUnit);
  const settlement=tenth(buyerPayment-buyerPoints-rmsFee-payFee-otherFee-couponSystemFee),profit=tenth(settlement-totalCost-num(p.sellerShippingCost)-num(p.fixedCostPerOrder));
  return {orderPrice:price,unitPrice:tenth(price/quantity),coupon,buyerPayment,buyerPoints,rmsFee,payFee,otherFee,couponSystemFee,settlement,profit};
}
export const solve=(fn,p)=>{const price=findMinimum(candidate=>fn(candidate,p),p.targetProfit);return price===null?null:fn(price,p)};
