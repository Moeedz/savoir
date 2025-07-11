
Object.defineProperty(window, "tlAdvancedFreeGift", {
  set(value) {
    if (value) {
        // value.render = newRender;
        // value.reRender - newReRender;
    }
    Object.defineProperty(window, "tlAdvancedFreeGift", {
      value,
      writable: true,
      configurable: true
    });
  },
  configurable: true
});