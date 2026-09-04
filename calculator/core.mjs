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
  const price=Math.max(0,Math.floor(num(listPrice)));
  const discount=Math.min(yen(price*.2),10_000),buyerPayment=price-discount;
  const settlement=Math.floor(price*.79+Number.EPSILON),estimatedDeduction=price-settlement;
  return {listPrice:price,discount,buyerPayment,settlement,estimatedDeduction,retentionRate:79,profit:settlement-num(p.productCost)-num(p.sellerShippingCost)};
}

export function megaPoAt(listPrice, p) {
  const price=Math.max(0,Math.floor(num(listPrice)));
  const coupon=Math.min(yen(price*.1),10_000),buyerPayment=price-coupon,points=Math.min(yen(buyerPayment*.1),10_000);
  const settlement=Math.floor(price*.8+Number.EPSILON),estimatedDeduction=price-settlement;
  return {listPrice:price,coupon,buyerPayment,points,settlement,estimatedDeduction,retentionRate:80,profit:settlement-num(p.productCost)-num(p.sellerShippingCost)};
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
  const discount=Math.min(yen(timeSalePrice*.2),10_000),buyerPayment=timeSalePrice-discount,adCost=strategyAdCost(p);
  const activitySettlement=Math.floor(price*.79+Number.EPSILON)-timeDiscount,settlement=activitySettlement-adCost;
  return {listPrice:price,timeDiscount,timeSalePrice,discount,buyerPayment,retentionRate:79,activitySettlement,adCost,settlement,profit:settlement-num(p.productCost)-num(p.sellerShippingCost)};
}
export function megaPoWithTimeAt(listPrice,p){
  const price=Math.max(0,Math.floor(num(listPrice))),timeDiscount=yen(price*rate(p.timeSaleRate)),timeSalePrice=Math.max(0,price-timeDiscount);
  const coupon=Math.min(yen(timeSalePrice*.1),10_000),buyerPayment=timeSalePrice-coupon,points=Math.min(yen(buyerPayment*.1),10_000),adCost=strategyAdCost(p);
  const activitySettlement=Math.floor(price*.8+Number.EPSILON)-timeDiscount,settlement=activitySettlement-adCost;
  return {listPrice:price,timeDiscount,timeSalePrice,coupon,buyerPayment,points,retentionRate:80,activitySettlement,adCost,settlement,profit:settlement-num(p.productCost)-num(p.sellerShippingCost)};
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
