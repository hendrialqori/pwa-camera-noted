import { useState } from 'react'
import ImagePicker from './components/ImagePicker.jsx'

export default function App() {
  const [title, setTitle] = useState('')
  const [images, setImages] = useState([])
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()

    const data = {
      title,
      images,
      note,
    }

    console.log('Form data:', data)
    setSaved(true)

    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-6">
          <p className="text-sm font-medium text-gray-500">PWA</p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Camera Notes</h1>
          <p className="mt-1 text-sm text-gray-500">Catat informasi dan ambil beberapa gambar langsung dari perangkat.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-medium text-gray-700">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Masukkan title"
              required
              className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900"
            />
          </div>

          <ImagePicker images={images} onChange={setImages} />

          <div>
            <label htmlFor="note" className="mb-2 block text-sm font-medium text-gray-700">Note</label>
            <textarea
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Tulis note..."
              rows={5}
              className="w-full resize-none rounded-xl border border-gray-300 px-3.5 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black active:scale-[0.99]"
          >
            Simpan
          </button>

          {saved && (
            <p className="text-center text-sm font-medium text-emerald-600">Data berhasil diproses.</p>
          )}
        </form>
      </div>
    </main>
  )
}
