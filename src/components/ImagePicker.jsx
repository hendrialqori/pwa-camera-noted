import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";

export default function ImagePicker({ images, onChange }) {
  const webcamRef = useRef(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // default: kamera belakang
  const [facingMode, setFacingMode] = useState("environment");

  // flash / torch
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isFlashSupported, setIsFlashSupported] = useState(false);

  const videoConstraints = {
    facingMode: {
      ideal: facingMode,
    },
    width: {
      ideal: 1280,
    },
    height: {
      ideal: 720,
    },
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();

    if (!imageSrc) return;

    onChange([...images, imageSrc]);
  }, [images, onChange]);

  const removeImage = (index) => {
    onChange(images.filter((_, imageIndex) => imageIndex !== index));
  };

  const openCamera = () => {
    setCameraError("");
    setIsCameraOpen(true);
  };

  const closeCamera = async () => {
    // matikan torch sebelum close camera
    if (isFlashOn) {
      await toggleFlash(false);
    }

    setIsCameraOpen(false);
  };

  /**
   * FRONT <-> BACK
   */
  const switchCamera = async () => {
    // matikan flash dulu ketika pindah camera
    if (isFlashOn) {
      await toggleFlash(false);
    }

    setFacingMode((current) =>
      current === "environment" ? "user" : "environment",
    );
  };

  /**
   * Ambil MediaStreamTrack dari react-webcam
   */
  const getVideoTrack = () => {
    const stream = webcamRef.current?.stream;

    if (!stream) return null;

    const tracks = stream.getVideoTracks();

    return tracks[0] ?? null;
  };

  /**
   * Cek apakah kamera/device support torch
   */
  const handleUserMedia = () => {
    const track = getVideoTrack();

    if (!track) return;

    try {
      const capabilities = track.getCapabilities?.();

      const hasTorch = Boolean(capabilities?.torch);

      setIsFlashSupported(hasTorch);
      setIsFlashOn(false);
    } catch (error) {
      console.error("Cannot read camera capabilities:", error);

      setIsFlashSupported(false);
    }
  };

  /**
   * Flash / Torch
   */
  const toggleFlash = async (forceValue) => {
    const track = getVideoTrack();

    if (!track) return;

    const nextValue = typeof forceValue === "boolean" ? forceValue : !isFlashOn;

    try {
      const capabilities = track.getCapabilities?.();

      if (!capabilities?.torch) {
        setIsFlashSupported(false);
        return;
      }

      await track.applyConstraints({
        advanced: [
          {
            torch: nextValue,
          },
        ],
      });

      setIsFlashOn(nextValue);
    } catch (error) {
      console.error("Failed to toggle flash:", error);

      setCameraError("Flash tidak didukung oleh kamera atau browser ini.");
    }
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Gambar
      </label>

      {!isCameraOpen && (
        <button
          type="button"
          onClick={openCamera}
          className="
            w-full
            rounded-xl
            border
            border-dashed
            border-gray-300
            bg-blue-900
            px-4
            py-4
            text-sm
            font-medium
            text-white
            transition
            hover:border-gray-400
            hover:bg-gray-50
            active:scale-[0.99]
          "
        >
          + Ambil Gambar
        </button>
      )}

      {isCameraOpen && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black">
          {/* CAMERA */}
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
            <Webcam
              key={facingMode}
              ref={webcamRef}
              audio={false}
              mirrored={facingMode === "user"}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.9}
              videoConstraints={videoConstraints}
              onUserMedia={handleUserMedia}
              onUserMediaError={() => {
                setCameraError(
                  "Kamera tidak dapat diakses. Pastikan izin kamera sudah diberikan.",
                );
              }}
              className="h-full w-full object-cover"
            />

            {/* CAMERA TOOLS */}
            <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-3">
              {/* FLASH */}
              <button
                type="button"
                disabled={!isFlashSupported}
                onClick={() => toggleFlash()}
                className={`
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  text-lg
                  text-white
                  backdrop-blur
                  ${
                    isFlashSupported
                      ? "bg-black/40"
                      : "cursor-not-allowed bg-black/20 opacity-40"
                  }
                `}
              >
                {isFlashOn ? "⚡" : "⚡"}
              </button>

              {/* SWITCH CAMERA */}
              <button
                type="button"
                onClick={switchCamera}
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  bg-black/40
                  text-lg
                  text-white
                  backdrop-blur
                "
              >
                ↻
              </button>
            </div>

            {/* CAMERA LABEL */}
            <div
              className="
                absolute
                bottom-3
                left-1/2
                -translate-x-1/2
                rounded-full
                bg-black/40
                px-3
                py-1
                text-xs
                text-white
                backdrop-blur
              "
            >
              {facingMode === "environment"
                ? "Kamera belakang"
                : "Kamera depan"}
            </div>
          </div>

          {/* CAMERA ACTIONS */}
          <div className="flex flex-col gap-3 bg-white p-3">
            <button
              type="button"
              onClick={capture}
              className="
                flex-1
                rounded-xl
                bg-blue-900
                px-4
                py-3
                text-sm
                font-semibold
                text-white
                active:scale-[0.99]
              "
            >
              Ambil Foto
            </button>
            <button
              type="button"
              onClick={closeCamera}
              className="
                flex-1
                rounded-xl
                border
                border-gray-300
                px-4
                py-3
                text-sm
                font-medium
                text-gray-700
              "
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {cameraError && (
        <p className="mt-2 text-sm text-red-600">{cameraError}</p>
      )}

      {/* IMAGE PREVIEW SLIDER */}
      {images.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Preview</p>

            <p className="text-xs text-gray-500">{images.length} gambar</p>
          </div>

          <div
            className="
              flex
              snap-x
              snap-mandatory
              gap-3
              overflow-x-auto
              scroll-smooth
              pb-2
              [-ms-overflow-style:none]
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            {images.map((image, index) => (
              <div
                key={`${index}-${image.slice(-20)}`}
                className="
                  relative
                  min-w-full
                  snap-center
                  overflow-hidden
                  rounded-2xl
                  bg-gray-100
                "
              >
                <div className="aspect-[3/4]">
                  <img
                    src={image}
                    alt={`Gambar ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* NUMBER */}
                <div
                  className="
                    absolute
                    left-3
                    top-3
                    rounded-full
                    bg-black/60
                    px-3
                    py-1
                    text-xs
                    text-white
                    backdrop-blur
                  "
                >
                  {index + 1} / {images.length}
                </div>

                {/* REMOVE */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  aria-label={`Hapus gambar ${index + 1}`}
                  className="
                    absolute
                    right-3
                    top-3
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-full
                    bg-black/60
                    text-lg
                    text-white
                    backdrop-blur
                  "
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* DOT INDICATOR */}
          <div className="mt-2 flex justify-center gap-1.5">
            {images.map((_, index) => (
              <div
                key={index}
                className="h-1.5 w-1.5 rounded-full bg-gray-300"
              />
            ))}
          </div>

          <p className="mt-2 text-center text-xs text-gray-400">
            Geser untuk melihat foto lainnya
          </p>
        </div>
      )}
    </div>
  );
}
