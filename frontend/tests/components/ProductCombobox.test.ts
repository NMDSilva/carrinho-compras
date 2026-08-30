import { describe, it, expect, vi } from 'vitest'
import { mount, DOMWrapper } from '@vue/test-utils'
import ProductCombobox from '@/components/ProductCombobox.vue'
import { flushTeleport } from '../helpers/teleport'

const body = new DOMWrapper(document.body)

type Item = { id: number; name: string }

describe('ProductCombobox', () => {
  it('faz debounce da pesquisa (não pede a cada tecla)', async () => {
    const search = vi.fn().mockResolvedValue([])
    const wrapper = mount(ProductCombobox<Item>, {
      attachTo: document.body,
      props: { modelValue: null, search, itemLabel: (i: Item) => i.name },
    })

    vi.useFakeTimers()
    try {
      const input = wrapper.find('[data-testid="combobox-input"]')
      await input.setValue('a')
      await input.setValue('ab')
      await input.setValue('abc')

      expect(search).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(300)

      expect(search).toHaveBeenCalledTimes(1)
      expect(search).toHaveBeenCalledWith('abc')
    } finally {
      vi.useRealTimers()
    }
  })

  it('mostra os resultados devolvidos pela pesquisa e emite update:modelValue ao selecionar', async () => {
    const results: Item[] = [
      { id: 1, name: 'Leite Mimosa' },
      { id: 2, name: 'Leite Agros' },
    ]
    const search = vi.fn().mockResolvedValue(results)
    const wrapper = mount(ProductCombobox<Item>, {
      attachTo: document.body,
      props: { modelValue: null, search, itemLabel: (i: Item) => i.name },
    })

    await wrapper.find('[data-testid="combobox-input"]').setValue('leite')
    await new Promise((r) => setTimeout(r, 320)) // debounce de 300ms
    await wrapper.vm.$nextTick()
    await flushTeleport()

    const options = body.findAll('[data-testid="combobox-option"]')
    expect(options).toHaveLength(2)
    expect(body.text()).toContain('Leite Mimosa')
    expect(body.text()).toContain('Leite Agros')

    await options[0].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([results[0]])
    expect(
      (wrapper.find('[data-testid="combobox-input"]').element as HTMLInputElement).value,
    ).toBe('Leite Mimosa')
  })

  it('não mostra nenhum dropdown quando a pesquisa não devolve resultados', async () => {
    const search = vi.fn().mockResolvedValue([])
    const wrapper = mount(ProductCombobox<Item>, {
      attachTo: document.body,
      props: { modelValue: null, search, itemLabel: (i: Item) => i.name },
    })

    await wrapper.find('[data-testid="combobox-input"]').setValue('xyz')
    await new Promise((r) => setTimeout(r, 320))
    await wrapper.vm.$nextTick()
    await flushTeleport()

    expect(body.findAll('[data-testid="combobox-option"]')).toHaveLength(0)
  })

  it('emite "clear" quando o texto é apagado depois de haver uma seleção', async () => {
    const search = vi.fn().mockResolvedValue([])
    const wrapper = mount(ProductCombobox<Item>, {
      attachTo: document.body,
      props: { modelValue: { id: 1, name: 'Leite Mimosa' }, search, itemLabel: (i: Item) => i.name },
    })

    const input = wrapper.find('[data-testid="combobox-input"]')
    await input.setValue('Leite Mimosa')
    await input.setValue('')

    expect(wrapper.emitted('clear')).toHaveLength(1)
  })
})
