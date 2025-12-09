import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Custom hook for making API calls with loading, error, and data states
 */
export const useApi = (apiFunction, immediate = false, dependencies) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const apiFunctionRef = useRef(apiFunction)

  useEffect(() => {
    apiFunctionRef.current = apiFunction
  }, [apiFunction])

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiFunctionRef.current(...args)
      setData(result)
      return result
    } catch (err) {
      const errorMessage = err?.error || err?.message || 'An error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const defaultDepsRef = useRef([])
  const effectDependencies = Array.isArray(dependencies) ? dependencies : defaultDepsRef.current

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [immediate, execute, ...effectDependencies])

  const refetch = useCallback(() => execute(), [execute])

  return { data, loading, error, execute, refetch }
}

/**
 * Hook for paginated API calls
 */
export const usePaginatedApi = (apiFunction) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)

  const apiFunctionRef = useRef(apiFunction)

  useEffect(() => {
    apiFunctionRef.current = apiFunction
  }, [apiFunction])

  const fetchData = useCallback(async (newPage = 1, newLimit = 20) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiFunctionRef.current(newPage, newLimit)
      setData(result.data || [])
      setPage(result.pagination?.page || newPage)
      setLimit(result.pagination?.limit || newLimit)
      setTotal(result.pagination?.total || 0)
      setPages(result.pagination?.pages || 0)
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [])

  const goToPage = useCallback((newPage) => {
    fetchData(newPage, limit)
  }, [fetchData, limit])

  const changeLimit = useCallback((newLimit) => {
    fetchData(1, newLimit)
  }, [fetchData])

  const nextPage = useCallback(() => {
    if (page < pages) {
      goToPage(page + 1)
    }
  }, [page, pages, goToPage])

  const prevPage = useCallback(() => {
    if (page > 1) {
      goToPage(page - 1)
    }
  }, [page, goToPage])

  return {
    data,
    loading,
    error,
    page,
    limit,
    total,
    pages,
    fetchData,
    goToPage,
    changeLimit,
    nextPage,
    prevPage,
    isFirstPage: page === 1,
    isLastPage: page === pages,
  }
}

/**
 * Hook for form handling
 */
export const useForm = (initialValues, onSubmit, options = {}) => {
  const { enableReinitialize = false } = options
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const initialRef = useRef(initialValues)

  useEffect(() => {
    if (enableReinitialize && initialRef.current !== initialValues) {
      setValues(initialValues)
      setErrors({})
      setTouched({})
      initialRef.current = initialValues
    }
  }, [enableReinitialize, initialValues])

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }, [])

  const handleBlur = useCallback((e) => {
    const { name } = e.target
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }))
  }, [])

  const handleSubmit = useCallback(async (e) => {
    if (e?.preventDefault) {
      e.preventDefault()
    }
    try {
      setLoading(true)
      await onSubmit(values)
    } catch (err) {
      setErrors(err?.details || { general: err?.message || 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }, [values, onSubmit])

  const resetForm = useCallback(() => {
    setValues(initialRef.current)
    setErrors({})
    setTouched({})
  }, [])

  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }, [])

  const setFieldError = useCallback((name, error) => {
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }))
  }, [])

  return {
    values,
    errors,
    touched,
    loading,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
  }
}

/**
 * Hook for debounced values
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for local storage
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  })

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(error)
    }
  }, [key, storedValue])

  return [storedValue, setValue]
}

/**
 * Hook for async state
 */
export const useAsyncState = (initialState) => {
  const [state, setState] = useState(initialState)

  const setStateAsync = useCallback((newState) => new Promise((resolve) => {
    setState((prevState) => {
      const updatedState = newState instanceof Function ? newState(prevState) : newState
      resolve(updatedState)
      return updatedState
    })
  }), [])

  return [state, setStateAsync]
}
