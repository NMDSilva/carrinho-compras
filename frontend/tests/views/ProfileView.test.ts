import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ProfileView from '@/views/ProfileView.vue'
import { useAuthStore } from '@/stores/auth'

const { updateMeMock } = vi.hoisted(() => ({ updateMeMock: vi.fn() }))

vi.mock('@/api', () => ({
  authApi: {
    updateMe: updateMeMock,
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  },
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

const currentUser = {
  id: 1,
  name: 'Ana',
  email: 'ana@example.com',
  role: 'USER' as const,
  theme: 'light' as const,
}

function mountWithUser() {
  const auth = useAuthStore()
  auth.user = { ...currentUser }
  return mount(ProfileView)
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

const PASSWORD_FIELD = '[data-testid="info-current-password"]'

describe('ProfileView — mudança de email', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    updateMeMock.mockReset()
    updateMeMock.mockResolvedValue({ ...currentUser })
  })

  it('não pede a password atual enquanto o email não mudar', async () => {
    const wrapper = mountWithUser()
    await wrapper.vm.$nextTick()

    expect(wrapper.find(PASSWORD_FIELD).exists()).toBe(false)
  })

  it('pede a password atual assim que o email é alterado', async () => {
    const wrapper = mountWithUser()
    await wrapper.find('input[type="email"]').setValue('nova@example.com')
    await wrapper.vm.$nextTick()

    expect(wrapper.find(PASSWORD_FIELD).exists()).toBe(true)
  })

  it('não submete a mudança de email sem a password atual', async () => {
    const wrapper = mountWithUser()
    await wrapper.find('input[type="email"]').setValue('nova@example.com')
    await wrapper.vm.$nextTick()

    await wrapper.findAll('button').find((b) => b.text().includes('Guardar alterações'))!.trigger('click')
    await flush()

    expect(updateMeMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Introduz a password atual')
  })

  it('envia a password atual quando o email muda', async () => {
    const wrapper = mountWithUser()
    await wrapper.find('input[type="email"]').setValue('nova@example.com')
    await wrapper.vm.$nextTick()
    await wrapper.find(PASSWORD_FIELD).setValue('segredo123')

    await wrapper.findAll('button').find((b) => b.text().includes('Guardar alterações'))!.trigger('click')
    await flush()

    expect(updateMeMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nova@example.com', currentPassword: 'segredo123' })
    )
  })

  it('não envia currentPassword quando só muda o nome', async () => {
    const wrapper = mountWithUser()
    await wrapper.find('input[type="text"]').setValue('Ana Nova')
    await wrapper.vm.$nextTick()

    await wrapper.findAll('button').find((b) => b.text().includes('Guardar alterações'))!.trigger('click')
    await flush()

    expect(updateMeMock).toHaveBeenCalledWith({ name: 'Ana Nova', email: 'ana@example.com' })
  })
})
