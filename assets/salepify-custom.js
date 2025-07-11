Object.defineProperty(window, "tlAdvancedFreeGift", {
  set(value) {
    if (value) {
          value.displaySettings.animation.show_confetti = true
          console.log('value.displaySettings',value.displaySettings)
    }
    Object.defineProperty(window, "tlAdvancedFreeGift", {
      value,
      writable: true,
      configurable: true
    });
  },
  configurable: true
});