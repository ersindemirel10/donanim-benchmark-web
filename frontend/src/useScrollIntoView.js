import { useEffect, useRef } from 'react'

// Form açılınca sayfa o forma kayar. Uzun listelerde aşağıdaki bir satırdan "Düzenle"ye
// basınca form listenin üstünde kalıp görünmez olmasın diye.
// Kullanım: const ref = useScrollIntoView(); <form ref={ref}>
// deps verilirse (örn. düzenlenen kayıt değişince) o değerler değiştikçe tekrar kayar.
export function useScrollIntoView(deps = []) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}
