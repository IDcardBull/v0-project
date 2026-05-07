Component({
  properties: {
    value: { type: Number, value: 0 },
    min:   { type: Number, value: 0 },
    max:   { type: Number, value: 99999 },
    step:  { type: Number, value: 1 }
  },
  methods: {
    inc() {
      const next = Number(this.data.value) + Number(this.data.step)
      if (next <= this.data.max) this.emit(next)
    },
    dec() {
      const next = Number(this.data.value) - Number(this.data.step)
      if (next >= this.data.min) this.emit(next)
    },
    onInput(e) {
      const v = Number(e.detail.value) || 0
      this.emit(v, { silentClamp: true })
    },
    onBlur(e) {
      let v = Number(e.detail.value) || 0
      if (v < this.data.min) v = this.data.min
      if (v > this.data.max) v = this.data.max
      this.emit(v)
    },
    emit(v, opts = {}) {
      this.triggerEvent('change', { value: v, ...opts })
    }
  }
})
