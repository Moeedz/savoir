
Object.defineProperty(window, "tlAdvancedFreeGift", {
  set(value) {
    console.log(value)
    Object.defineProperty(window, "tlAdvancedFreeGift", {
      value,
      writable: true,
      configurable: true
    });
  },
  configurable: true
});