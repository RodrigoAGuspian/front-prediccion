
import { defineStore } from 'pinia'
import axios from 'axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null
  }),
  actions: {
    async login(email, password) {
      const res = await axios.post('https://tu-api.com/login', { email, password })
      this.token = res.data.token
      this.user = res.data.user
    }
  }
})
