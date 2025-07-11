const newReRender = async () => {        
        const listRuleNeedToAddGift = [];
        const listRuleNeedToRemoveGift = [];
        let availableToClaim = [];
        let needToReload = false;
        let hasRuleMetCondition = false;

        const isGiftsOnlyLayout = window.tlAdvancedFreeGift.displaySettings.layout === window.tlAdvancedFreeGift.POPUP_LAYOUT.GIFTS_ONLY;

        if (isGiftsOnlyLayout) {
            window.tlAdvancedFreeGift.renderedRules = new Set();
        }

        const sessionState = window.tlAdvancedFreeGift.getSessionState(window.tlAdvancedFreeGift.SESSION_STORAGE);
        
        let unrenderedRules = window.tlAdvancedFreeGift.rules;

        if (isGiftsOnlyLayout) {
            unrenderedRules = window.tlAdvancedFreeGift.rules.filter(
                rule => !(sessionState.dismissStatus?.[rule.id]) && !window.tlAdvancedFreeGift.renderedRules.has(rule.id)
            );
        } else {
            if (!sessionState.ruleIdMetConditionTimesMap) {
                sessionState.ruleIdMetConditionTimesMap = unrenderedRules.reduce((acc, rule) => ({ ...acc, [rule.id]: 0 }), {}) || {};
            }
        }

        for (let i = 0; i < unrenderedRules.length; i++) {
            const rule = unrenderedRules[i];
            const ruleId = rule.id;
            const [conditionState, claimedCount, canClaimCount, remain, remainSpecific] = window.tlAdvancedFreeGift.getRemain(rule);
            
            if (!isGiftsOnlyLayout) {
                if (canClaimCount > sessionState.ruleIdMetConditionTimesMap[ruleId]) {
                    sessionState.canShowDetailedListPopup = true;
                }
                sessionState.ruleIdMetConditionTimesMap[ruleId] = canClaimCount;
            }

            if(claimedCount < canClaimCount && rule.auto_add_gift) {
                const isCheapestOption = rule.gift_type == window.tlAdvancedFreeGift.GIFT_TYPE.SAME_BUY;
                if(isCheapestOption){
                    // Update for theme using XHR
                    const numberParentCanBeConverted  = window.tlAdvancedFreeGift.ruleIdMapNumberParentCanBeConvertIntoGift.get(ruleId)  || 0;
                    if(window.tlAdvancedFreeGift.isCallXHR && numberParentCanBeConverted >= rule.gift_qty * canClaimCount){
                        listRuleNeedToAddGift.push(ruleId);
                    }
                }else {
                    listRuleNeedToAddGift.push(ruleId);
                }

            }else if(window.tlAdvancedFreeGift.isCallXHR && claimedCount > canClaimCount && rule.auto_remove_gift){
                // Remove gift for theme using xhr
                listRuleNeedToRemoveGift.push({
                    id: ruleId,
                    claimed: claimedCount,
                    can_claim: canClaimCount
                });
            }

            // Store handle of parent and child product
            const uniqueProductHandle = new Set();
            
            // Store list parent id in order current product => required => rest product 
            const listChildDisplayIds = [];
            // ChildId map quantity required
            const childMapRequiredQty = {};

            if(rule.gift_type == window.tlAdvancedFreeGift.GIFT_TYPE.COLLECTION){

            }else {
                rule.listChilds.map(child =>{
                    listChildDisplayIds.push(child.shopify_id);
                    if(!window.tlAdvancedFreeGift.shopifyIdMapData.get(child.product_id)){
                        uniqueProductHandle.add(child.handle)
                    }
                    if(child.quantity){
                        childMapRequiredQty[child.shopify_id] = child.quantity;
                    }
                })
            }
            
            if(rule.show_free_gift_widget && window.tlAdvancedFreeGift.checkShowOnPage(rule.show_on_pages)){
                if(claimedCount < canClaimCount && !rule.auto_add_gift) {
                    hasRuleMetCondition = true;
                }
                const totalGift = rule.gift_qty * window.tlAdvancedFreeGift.ruleIdMapCanClaimTime.get(ruleId);

                const ruleTranslation = window.tlAdvancedFreeGift.getRuleTranslation(ruleId);
                const mainSectionElement = document.querySelector(`#salepify-fg-advanced-main-section-${ruleId}`);
                const gifts = await window.tlAdvancedFreeGift.getGifts(rule, listChildDisplayIds, childMapRequiredQty);

                if (isGiftsOnlyLayout) {
                    if (conditionState === window.tlAdvancedFreeGift.CONDITION_STATE.NOT_MET && !rule.auto_add_gift) {
                        window.tlAdvancedFreeGift.ruleIdMapSelectedGift.set(ruleId, {});
                    }

                    if (hasRuleMetCondition) {                        
                        document.querySelector(".salepify-fg-advanced-header__title").innerHTML = ruleTranslation.title;
                        document.querySelector(".salepify-fg-advanced-header__subtitle").innerHTML = ruleTranslation.subtitle;

                        const bodyHtml = `
                            <div 
                                class="salepify-fg-advanced--gifts-only salepify-fg-advanced__main-section-container" 
                                id="salepify-fg-advanced__main-section-container-${ruleId}"
                            >
                                
                                <div class="salepify-fg-advanced__gift-container"
                                    ${rule.gift_type == window.tlAdvancedFreeGift.GIFT_TYPE.COLLECTION 
                                        ? `onscroll="window.tlAdvancedFreeGift.handleLoadingGift(${ruleId})"` 
                                        : ""}
                                >
                                    ${window.tlAdvancedFreeGift.renderGifts(rule, gifts, conditionState)}
                                </div>

                                <div class="salepify-fg-advanced__footer">
                                    <div class="salepify-fg-advanced__dismiss-toggler">
                                        <label class="salepify-fg-advanced__switch">
                                            <input 
                                                type="checkbox" 
                                                onChange="window.tlAdvancedFreeGift.toggleDismissWidgetStatus(${ruleId})"
                                            >
                                            <span class="salepify-fg-advanced__slider" />
                                        </label>
                                        <span class="salepify-fg-advanced__dismiss-help-text">${ruleTranslation.dismiss_help_text}</span>
                                    </div>

                                    ${
                                        conditionState === window.tlAdvancedFreeGift.CONDITION_STATE.MET_BEFORE_CLAIM 
                                            ? `
                                                <div 
                                                    class="salepify-fg-advanced__claim-button" 
                                                    onclick="window.tlAdvancedFreeGift.handleAddGiftAndReload(${ruleId})"
                                                >
                                                    ${ruleTranslation.claim_btn}
                                                    (${conditionState !== window.tlAdvancedFreeGift.CONDITION_STATE.MET_AFTER_CLAIM ? window.tlAdvancedFreeGift.getTotalSelectedGift(ruleId) : totalGift}/${totalGift})
                                                </div>
                                            `
                                            : `<div class="salepify-fg-advanced__claim-button--claimed">Claimed</div>`
                                    }

                                </div>

                                <div id="salepify-fg-advanced-error-${ruleId}">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 512 512">
                                        <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/>
                                    </svg>
                                    <span class="salepify-fg-advanced-error__message"></span>
                                </div>
                            </div>
                        `;

                        document.querySelector(".salepify-fg-advanced-body").innerHTML = bodyHtml;

                        window.tlAdvancedFreeGift.renderedRules.add(ruleId);
                        break;
                    }
                } else {
                    // Offer title
                    let offerTitleInnerHTML = ruleTranslation.main_offer.eligible_offer_title;
    
                    if(conditionState === window.tlAdvancedFreeGift.CONDITION_STATE.NOT_MET){
                        // Set state main section
                        mainSectionElement.classList.remove("salepify-fg-advanced-main-section--allow-claim", "salepify-fg-advanced-main-section--claimed");
                    
                        offerTitleInnerHTML = window.tlAdvancedFreeGift.handleReplaceVariable(rule, window.tlAdvancedFreeGift.getOfferTitle(rule), remain, remainSpecific, totalGift);
                    }else if(conditionState === window.tlAdvancedFreeGift.CONDITION_STATE.MET_BEFORE_CLAIM){
                        // Set state main section
                        mainSectionElement.classList.remove("salepify-fg-advanced-main-section--claimed");
                        mainSectionElement.classList.add("salepify-fg-advanced-main-section--allow-claim")
                    }else {
                        // Set state main section
                        mainSectionElement.classList.remove("salepify-fg-advanced-main-section--allow-claim");
                        mainSectionElement.classList.add("salepify-fg-advanced-main-section--claimed")
                    }
    
                    // Set innerHTML of offer_title
                    mainSectionElement.querySelector(".salepify-fg-advanced-main-section__offer-title").innerHTML = offerTitleInnerHTML;
    
                    // Set innerHTML of upsell_msg
                    mainSectionElement.querySelector(".salepify-fg-advanced-main-section__upsell-banner").innerHTML = window.tlAdvancedFreeGift.handleReplaceVariable(
                        rule, 
                        window.tlAdvancedFreeGift.renderUpsellMsg(conditionState, rule), 
                        remain, 
                        remainSpecific, 
                        totalGift
                    );

                    // Footer elment
                    const footerElment = mainSectionElement.querySelector(".salepify-fg-advanced-footer");
                    if(!rule.auto_add_gift && conditionState !== window.tlAdvancedFreeGift.CONDITION_STATE.NOT_MET){
                        //Set footer style
                        footerElment.innerHTML = `
                            <div class="salepify-fg-advanced-footer__remain-gift-title">
                                ${ruleTranslation.manual_choose_gift.selected_text} 
                                ${conditionState !== window.tlAdvancedFreeGift.CONDITION_STATE.MET_AFTER_CLAIM ?
                                    window.tlAdvancedFreeGift.getTotalSelectedGift(ruleId) : totalGift
                                }/${totalGift}
                            </div>
                                
                            ${
                                conditionState === window.tlAdvancedFreeGift.CONDITION_STATE.MET_BEFORE_CLAIM ? 
                                    `<div class="salepify-fg-advanced-footer__claim-btn btn--fake" 
                                        onclick='${window.tlAdvancedFreeGift.itemsInTempCart.size > 0 ? 
                                            `window.tlAdvancedFreeGift.handleAddGiftToTempCart(${ruleId})`  :
                                            `window.tlAdvancedFreeGift.handleAddGiftAndReload(${ruleId})` 
                                        }'
                                    >
                                        ${ruleTranslation.manual_choose_gift.claim_btn}
                                    </div>` :
                                    `<div class="salepify-fg-advanced-footer__claim-btn salepify-fg-advanced-footer__claim-btn--claimed">
                                        ${ruleTranslation.manual_choose_gift.claimed_btn}
                                    </div> `
                            }
                        `;
                        footerElment.style.display = "flex";
                    }else {
                        footerElment.style.display = "none";
                    }
    
                    const listGiftElement = mainSectionElement.querySelectorAll(`div[id^="salepify-fg-advanced-gift-${ruleId}"]`);
    
                    listGiftElement.forEach((element) => {
                        const checkBoxElement = element.querySelector(".salepify-fg-advanced-checkbox");
                        const imageElement = element.querySelector(".salepify-fg-advanced-gift-info__img");
    
                        if(conditionState === window.tlAdvancedFreeGift.CONDITION_STATE.MET_BEFORE_CLAIM){
                            if(!rule.auto_add_gift){
                                //Set show checkbox
                                checkBoxElement.classList.remove("salepify-fg-advanced-checkbox--hide");
                                checkBoxElement.classList.add("salepify-fg-advanced-checkbox--show");
                            }
    
                            // Set image
                            imageElement.classList.remove("salepify-fg-advanced-gift-info__img--condition-not-met");
                            imageElement.querySelector("svg").style.display = "none";
                        
                        }else {
                            //Set hide checkbox
                            checkBoxElement.classList.remove("salepify-fg-advanced-checkbox--show");
                            checkBoxElement.classList.add("salepify-fg-advanced-checkbox--hide");
                            element.querySelector(".salepify-fg-advanced-gift-qty-selector").style.display = "none";
    
                            // Set image
                            if(conditionState === window.tlAdvancedFreeGift.CONDITION_STATE.NOT_MET){
                                imageElement.classList.add("salepify-fg-advanced-gift-info__img--condition-not-met");
                                imageElement.querySelector("svg").style.display = "block";
                                checkBoxElement.querySelector(".salepify-fg-advanced-checkbox__inp-cbx").checked = false;
        
                                if(!rule.auto_add_gift){
                                    window.tlAdvancedFreeGift.ruleIdMapSelectedGift.set(ruleId, {}); 
                                }
                            }else {
                                imageElement.classList.remove("salepify-fg-advanced-gift-info__img--condition-not-met");
                                imageElement.querySelector("svg").style.display = "none";
                            }
                        }
                    })
    
                }

                if (conditionState === window.tlAdvancedFreeGift.CONDITION_STATE.MET_BEFORE_CLAIM) {
                    availableToClaim.push(ruleId);
                }
            }else {
                needToReload = window.tlAdvancedFreeGift.updateSelectedGifts(rule);
            }

            if (isGiftsOnlyLayout && hasRuleMetCondition) {
                break;
            }
        }

        if(listRuleNeedToAddGift.length){
            if(window.tlAdvancedFreeGift.itemsInTempCart.size){
                listRuleNeedToAddGift.map((ruleId) => {
                    window.tlAdvancedFreeGift.updateGiftsInTempCart(ruleId, true);
                })
            }else {
                const addCartReq = await window.tlAdvancedFreeGift.handleAddGift(listRuleNeedToAddGift);
                if(addCartReq.status === 200){
                    if (window.tlAdvancedFreeGift.displaySettings?.animation.show_confetti) {
                        window.tlAdvancedFreeGift.showConfetti();
                    }
                    window.tlAdvancedFreeGift.showIconPopUpMessage("You’ve received a gift. Please reload to view the changes.", availableToClaim.length);
                    if(needToReload || window.tlAdvancedFreeGift.isCallXHR) {
                        if(!window.TLCustomEventGiftsAdvanced){
                            tlPopupCartReRender();
                            return;
                        } else if (window.TLCustomEventGiftsAdvanced == 1) {
                            window.dispatchEvent(new CustomEvent("TLCustomEvent:FreeGiftsAdvanced-reRender-needToReload"));
                        }
                    };
                }else {
                    // Return error if there are not enough gift to add
                    const addCartRes = await addCartReq.json();
                    window.tlAdvancedFreeGift.showIconPopUpMessage(addCartRes.description, 1)
                }
            }
        }else {
            if(availableToClaim.length && !isGiftsOnlyLayout){
                const manualText = window.tlAdvancedFreeGift.getRuleTranslation(availableToClaim[0]).gift_icon.manual
                window.tlAdvancedFreeGift.showIconPopUpMessage(manualText, availableToClaim.length);
            }else {
                // window.tlAdvancedFreeGift.iconPopupBadgeElement.style = "display: none";
            }
        }

        if(listRuleNeedToRemoveGift.length && !window.tlAdvancedFreeGift.itemsInTempCart.size){
            const response = await window.tlAdvancedFreeGift.handleRemoveGift(listRuleNeedToRemoveGift)
            if(response.status == 200 && (needToReload || window.tlAdvancedFreeGift.isCallXHR)) {
                if(!window.TLCustomEventGiftsAdvanced){
                    tlPopupCartReRender();
                    return;
                } else if (window.TLCustomEventGiftsAdvanced == 1) {
                    window.dispatchEvent(new CustomEvent("TLCustomEvent:FreeGiftsAdvanced-reRender-needToReload"));
                }
            };
        }

        window.tlAdvancedFreeGift.renderTempCart();
        if(hasRuleMetCondition){
            if ((!isGiftsOnlyLayout && sessionState.canShowDetailedListPopup) || isGiftsOnlyLayout) {
                if (!window.tlAdvancedFreeGift.isAutoOpenPopup || (isGiftsOnlyLayout && window.tlAdvancedFreeGift.isAutoOpenPopup)) {
                    if (window.tlAdvancedFreeGift.displaySettings?.animation.show_confetti) {
                        window.tlAdvancedFreeGift.showConfetti();
                    }
                    window.tlAdvancedFreeGift.openGiftModal();
                    window.tlAdvancedFreeGift.isAutoOpenPopup = true;
                }
            }
        }

        window.tlAdvancedFreeGift.setSessionState(window.tlAdvancedFreeGift.SESSION_STORAGE, sessionState);
    }
Object.defineProperty(window, "tlAdvancedFreeGift", {
  set(value) {
    if (value) {
        // value.render = ;
        value.reRender = newReRender;
    }
    Object.defineProperty(window, "tlAdvancedFreeGift", {
      value,
      writable: true,
      configurable: true
    });
  },
  configurable: true
});