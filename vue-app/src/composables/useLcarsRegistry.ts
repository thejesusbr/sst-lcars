import { reactive, type ComponentPublicInstance } from 'vue'

interface LcarsRegistryItem {
  id: string
  component: ComponentPublicInstance | null
  data: Record<string, unknown>
}

const registry = reactive<Map<string, LcarsRegistryItem>>(new Map())
const toggleGroups = reactive<Map<string, Set<string>>>(new Map())

export function useLcarsRegistry() {
  const register = (id: string, component: ComponentPublicInstance | null, data: Record<string, unknown> = {}) => {
    registry.set(id, { id, component, data })
  }

  const unregister = (id: string) => {
    registry.delete(id)
    toggleGroups.forEach((group) => {
      group.delete(id)
    })
  }

  const get = (id: string): LcarsRegistryItem | undefined => {
    return registry.get(id)
  }

  const getComponent = (id: string): ComponentPublicInstance | null => {
    return registry.get(id)?.component ?? null
  }

  const getData = (id: string): Record<string, unknown> | undefined => {
    return registry.get(id)?.data
  }

  const setData = (id: string, key: string, value: unknown) => {
    const item = registry.get(id)
    if (item) {
      item.data[key] = value
    }
  }

  const addToToggleGroup = (groupName: string, id: string) => {
    if (!toggleGroups.has(groupName)) {
      toggleGroups.set(groupName, new Set())
    }
    toggleGroups.get(groupName)?.add(id)
  }

  const removeFromToggleGroup = (groupName: string, id: string) => {
    toggleGroups.get(groupName)?.delete(id)
  }

  const getToggleGroup = (groupName: string): Set<string> | undefined => {
    return toggleGroups.get(groupName)
  }

  const generateId = (prefix: string): string => {
    return `${prefix}SID${Math.random().toString(36).substr(2, 9)}`
  }

  const camelCase = (str: string): string => {
    return str.replace(/-([a-z])/gi, (_, letter) => letter.toUpperCase())
  }

  return {
    registry,
    toggleGroups,
    register,
    unregister,
    get,
    getComponent,
    getData,
    setData,
    addToToggleGroup,
    removeFromToggleGroup,
    getToggleGroup,
    generateId,
    camelCase
  }
}
