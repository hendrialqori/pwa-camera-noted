import { useState } from 'react'
import { Toaster, toast } from 'sonner'
import ImagePicker from './components/ImagePicker'

export default function App() {
  const [title, setTitle] = useState('')
  const [images, setImages] = useState([])
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting) return

    if (!title.trim()) {
      toast.error('Title wajib diisi')
      return
    }

    if (images.length === 0) {
      toast.error('Minimal ambil 1 gambar')
      return
    }

    setIsSubmitting(true)

    const saveData = async () => {
      // Simulasi request API
      await new Promise((resolve) => {
        setTimeout(resolve, 1500)
      })

      // Nanti bisa diganti fetch / axios
      return {
        title,
        images,
        note,
      }
    }

    try {
      await toast.promise(saveData(), {
        loading: 'Menyimpan data...',
        success: 'Data berhasil disimpan',
        error: 'Data gagal disimpan',
      })

      setTitle('')
      setImages([])
      setNote('')
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Camera Notes
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Ambil gambar dan tambahkan catatan.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl bg-white p-5 shadow-sm"
          >
            {/* TITLE */}
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Title
              </label>

              <input
                id="title"
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value)
                }}
                placeholder="Masukkan title"
                disabled={isSubmitting}
                className="
                  w-full
                  rounded-xl
                  border
                  border-gray-300
                  px-4
                  py-3
                  text-sm
                  text-gray-900
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-gray-500
                  disabled:cursor-not-allowed
                  disabled:bg-gray-100
                "
              />
            </div>

            {/* IMAGE */}
            <ImagePicker
              images={images}
              onChange={setImages}
            />

            {/* NOTE */}
            <div>
              <label
                htmlFor="note"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Note
              </label>

              <textarea
                id="note"
                value={note}
                onChange={(event) => {
                  setNote(event.target.value)
                }}
                placeholder="Tambahkan catatan..."
                rows={5}
                disabled={isSubmitting}
                className="
                  w-full
                  resize-none
                  rounded-xl
                  border
                  border-gray-300
                  px-4
                  py-3
                  text-sm
                  text-gray-900
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-gray-500
                  disabled:cursor-not-allowed
                  disabled:bg-gray-100
                "
              />
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                w-full
                rounded-xl
                bg-gray-900
                px-4
                py-3
                text-sm
                font-semibold
                text-white
                transition
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:bg-gray-400
                disabled:active:scale-100
              "
            >
              Simpan
            </button>
          </form>
        </div>
      </main>
    </>
  )
}
