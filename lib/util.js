module.exports = {
  convertBytes(size) {
    if (size === 0) return "0B"
    let i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + '' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
  },
  convertHumanReadableBytes(size = '10gb') {
    const factors = {
      kb: 1024,
      mb: 1024 ** 2,
      gb: 1024 ** 3,
    };
    const ret = parseFloat(size);
    const unit = size.substring(ret.toString().length).toLowerCase();
    switch (unit) {
      case 'b':
        return ret;
      case 'gb':
        return ret * factors.gb;
      case 'mb':
        return ret * factors.mb;
      case 'kb':
        return ret * factors.kb;
    }
    return Infinity;
  },
  addLeadingZero(number) {
    if (number >= 0 && number <= 9) return '0' + parseInt(number);
    else return number;
  },
  range(start, end) {
    const numbers = [];
    for (let i = start; i <= end; i++) {
      numbers.push(i);
    }
    return numbers;
  },
  dateFormat(date) {
    return `${this.addLeadingZero(date.getUTCHours())}:${this.addLeadingZero(date.getUTCMinutes())}:${this.addLeadingZero(date.getUTCSeconds())}`
  },
  async delay(s) {
    return await new Promise((resolve, reject) => {
      setTimeout(resolve, s * 1000);
    });
  },
  interval: {
    _ref: [],
    _init(errFunc) {
      setInterval(() => {
        this._ref = this._ref.map(r => {
          if (r === undefined) return undefined;
          if (Date.now() >= r.lastTrigger + r.interval) {
            r.lastTrigger = Date.now();
            try {
              r.func();
            } catch (e) {
              errFunc(e);
            }
          }
          return r;
        });
      }, 5)
    },
    set(func, interval) {
      return this._ref.push({ func, interval, lastTrigger: Date.now() }) - 1;
    },
    clear(i) {
      if (!this._ref[i]) throw new Error(`${i} is not a valid index with _ref length ${this._ref.length}`);
      this._ref[i] = undefined;
      // this._ref = this._ref.filter((e, index) => i !== index);
      return true;
    },
    clearAll() {
      this._ref = this._ref.map(() => undefined);
      return true;
    }
  },
  // clearAllIntervals() {
  //   const lastIntervalID = setInterval(() => { }, 10000);
  //   for (let i = 1; i < lastIntervalID; i++) {
  //     clearInterval(i);
  //   }
  // },
}