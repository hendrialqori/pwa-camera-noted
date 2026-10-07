import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";

export default function ImagePicker({ images, onChange }) {
  const webcamRef = useRef(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const [facingMode, setFacingMode] = useState("environment");

  const [capturedImage, setCapturedImage] = useState(null);

  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isFlashSupported, setIsFlashSupported] = useState(false);

  const [isCapturing, setIsCapturing] = useState(false);

  const videoConstraints = {
    facingMode: {
      ideal: facingMode,
    },
    width: {
      ideal: 3840,
    },
    height: {
      ideal: 2160,
    },
  };

  const getVideoTrack = () => {
    const stream = webcamRef.current?.stream;

    if (!stream) return null;

    return stream.getVideoTracks()[0] ?? null;
  };

  const openCamera = () => {
    setCameraError("");
    setCapturedImage(null);
    setIsCameraOpen(true);
  };

  const closeCamera = async () => {
    if (isFlashOn) {
      await toggleFlash(false);
    }

    setCapturedImage(null);
    setCameraError("");
    setIsCapturing(false);
    setIsCameraOpen(false);
  };

  const capture = useCallback(async () => {
    if (isCapturing) return;

    setIsCapturing(true);
    setCameraError("");

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const imageSrc = webcamRef.current?.getScreenshot();

      if (!imageSrc) {
        setCameraError("Gambar gagal diambil.");
        return;
      }

      setCapturedImage(imageSrc);
    } catch (error) {
      console.error("Capture error:", error);

      setCameraError("Gambar gagal diambil.");
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  const retake = () => {
    setCapturedImage(null);
    setCameraError("");
  };

  const saveImage = async () => {
    if (!capturedImage) return;

    if (isFlashOn) {
      await toggleFlash(false);
    }

    // gambar terbaru masuk index 0
    onChange([capturedImage, ...images]);

    setCapturedImage(null);
    setCameraError("");
    setIsCameraOpen(false);
  };

  const removeImage = (index) => {
    const nextImages = images.filter((_, imageIndex) => imageIndex !== index);

    onChange(nextImages);
  };

  const switchCamera = async () => {
    if (isFlashOn) {
      await toggleFlash(false);
    }

    setCameraError("");
    setIsFlashSupported(false);
    setIsFlashOn(false);

    setFacingMode((current) =>
      current === "environment" ? "user" : "environment",
    );
  };

  const handleUserMedia = () => {
    const track = getVideoTrack();

    if (!track) return;

    try {
      const settings = track.getSettings?.();

      console.log("Camera settings:", {
        width: settings?.width,
        height: settings?.height,
        frameRate: settings?.frameRate,
        facingMode: settings?.facingMode,
      });

      const capabilities = track.getCapabilities?.();

      setIsFlashSupported(Boolean(capabilities?.torch));
      setIsFlashOn(false);
      setCameraError("");
    } catch (error) {
      console.error("Failed to read camera capabilities:", error);

      setIsFlashSupported(false);
    }
  };

  const toggleFlash = async (forceValue) => {
    const track = getVideoTrack();

    if (!track) return;

    const nextValue = typeof forceValue === "boolean" ? forceValue : !isFlashOn;

    try {
      const capabilities = track.getCapabilities?.();

      if (!capabilities?.torch) {
        setIsFlashSupported(false);

        setCameraError("Flash tidak didukung oleh kamera ini.");

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
      setCameraError("");
    } catch (error) {
      console.error("Failed to toggle flash:", error);

      setCameraError(
        "Flash tidak dapat digunakan pada browser atau kamera ini.",
      );
    }
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Gambar
      </label>

      {/* OPEN CAMERA */}
      <button
        type="button"
        onClick={openCamera}
        className="
          w-full
          rounded-xl
          border
          border-dashed
          border-gray-300
          bg-white
          px-4
          py-4
          text-sm
          font-medium
          text-gray-700
          transition
          hover:border-gray-400
          hover:bg-gray-50
          active:scale-[0.99]
        "
      >
        + Ambil Gambar
      </button>

      {/* IMAGE LIST */}
      {images.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Foto</p>

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
                  min-w-[85%]
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
                    className="
                      h-full
                      w-full
                      object-cover
                    "
                  />
                </div>

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
                    active:scale-95
                  "
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {images.length > 1 && (
            <p
              className="
                mt-1
                text-center
                text-xs
                text-gray-400
              "
            >
              Geser untuk melihat foto lainnya
            </p>
          )}
        </div>
      )}

      {/* FULLSCREEN CAMERA */}
      {isCameraOpen && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            bg-black
          "
        >
          {!capturedImage && (
            <>
              <Webcam
                key={facingMode}
                ref={webcamRef}
                audio={false}
                mirrored={facingMode === "user"}
                screenshotFormat="image/jpeg"
                screenshotQuality={1}
                forceScreenshotSourceSize
                videoConstraints={videoConstraints}
                onUserMedia={handleUserMedia}
                onUserMediaError={(error) => {
                  console.error("Camera error:", error);

                  setCameraError(
                    "Kamera tidak dapat diakses. Pastikan izin kamera sudah diberikan.",
                  );
                }}
                className="
                  absolute
                  inset-0
                  h-full
                  w-full
                  object-cover
                "
              />

              {/* CAPTURE LOADING */}
              {isCapturing && (
                <div
                  className="
                    absolute
                    inset-0
                    z-40
                    flex
                    flex-col
                    items-center
                    justify-center
                    bg-black/40
                  "
                >
                  <div
                    className="
                      h-12
                      w-12
                      animate-spin
                      rounded-full
                      border-4
                      border-white/30
                      border-t-white
                    "
                  />

                  <p
                    className="
                      mt-4
                      text-sm
                      font-medium
                      text-white
                    "
                  >
                    Mengambil foto...
                  </p>
                </div>
              )}

              {/* TOP GRADIENT */}
              <div
                className="
                  pointer-events-none
                  absolute
                  left-0
                  right-0
                  top-0
                  h-32
                  bg-gradient-to-b
                  from-black/60
                  to-transparent
                "
              />

              {/* TOP CONTROLS */}
              <div
                className="
                  absolute
                  left-0
                  right-0
                  top-0
                  z-20
                  flex
                  items-center
                  justify-between
                  p-4
                  pt-[max(1rem,env(safe-area-inset-top))]
                "
              >
                {/* CLOSE */}
                <button
                  type="button"
                  onClick={closeCamera}
                  disabled={isCapturing}
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-full
                    bg-black/40
                    text-2xl
                    text-white
                    backdrop-blur
                    active:scale-95
                    disabled:opacity-40
                  "
                >
                  ×
                </button>

                <div className="flex items-center gap-3">
                  {/* FLASH */}
                  <button
                    type="button"
                    disabled={!isFlashSupported || isCapturing}
                    onClick={() => toggleFlash()}
                    className={`
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-full
                      text-lg
                      backdrop-blur
                      active:scale-95
                      ${
                        isFlashSupported
                          ? isFlashOn
                            ? "bg-white text-black"
                            : "bg-black/40 text-white"
                          : "cursor-not-allowed bg-black/20 text-white opacity-40"
                      }
                    `}
                  >
                    ⚡
                  </button>

                  {/* SWITCH CAMERA */}
                  <button
                    type="button"
                    onClick={switchCamera}
                    disabled={isCapturing}
                    className="
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-full
                      bg-black/40
                      text-xl
                      text-white
                      backdrop-blur
                      active:scale-95
                      disabled:opacity-40
                    "
                  >
                    ↻
                  </button>
                </div>
              </div>

              {/* CAMERA INFO */}
              <div
                className="
                  absolute
                  left-1/2
                  top-20
                  z-20
                  -translate-x-1/2
                  rounded-full
                  bg-black/35
                  px-3
                  py-1.5
                  text-xs
                  text-white
                  backdrop-blur
                "
              >
                {facingMode === "environment"
                  ? "Kamera belakang"
                  : "Kamera depan"}
              </div>

              {/* ERROR */}
              {cameraError && (
                <div
                  className="
                    absolute
                    left-4
                    right-4
                    top-32
                    z-30
                    rounded-xl
                    bg-red-600/90
                    px-4
                    py-3
                    text-center
                    text-sm
                    text-white
                    backdrop-blur
                  "
                >
                  {cameraError}
                </div>
              )}

              {/* BOTTOM GRADIENT */}
              <div
                className="
                  pointer-events-none
                  absolute
                  bottom-0
                  left-0
                  right-0
                  h-44
                  bg-gradient-to-t
                  from-black/70
                  to-transparent
                "
              />

              {/* SHUTTER */}
              <div
                className="
                  absolute
                  bottom-0
                  left-0
                  right-0
                  z-20
                  flex
                  justify-center
                  pb-[max(2rem,env(safe-area-inset-bottom))]
                  pt-8
                "
              >
                <button
                  type="button"
                  onClick={capture}
                  disabled={isCapturing}
                  aria-label="Ambil foto"
                  className={`
                    flex
                    h-20
                    w-20
                    items-center
                    justify-center
                    rounded-full
                    border-4
                    border-white
                    bg-transparent
                    transition
                    ${
                      isCapturing
                        ? "cursor-not-allowed opacity-50"
                        : "active:scale-90"
                    }
                  `}
                >
                  <div
                    className="
                      h-16
                      w-16
                      rounded-full
                      bg-white
                    "
                  />
                </button>
              </div>
            </>
          )}

          {/* CAPTURE PREVIEW */}
          {capturedImage && (
            <div
              className="
                flex
                h-full
                flex-col
                bg-black
              "
            >
              {/* IMAGE */}
              <div
                className="
                  relative
                  min-h-0
                  flex-1
                  bg-black
                "
              >
                <img
                  src={capturedImage}
                  alt="Preview hasil foto"
                  className="
                    absolute
                    inset-0
                    h-full
                    w-full
                    object-contain
                  "
                />
              </div>

              {/* ACTIONS */}
              <div
                className="
                  shrink-0
                  bg-black
                  px-4
                  pb-[max(2rem,env(safe-area-inset-bottom))]
                  pt-4
                "
              >
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={retake}
                    className="
                      flex-1
                      rounded-2xl
                      border
                      border-white/30
                      bg-white/10
                      px-4
                      py-4
                      text-sm
                      font-semibold
                      text-white
                      backdrop-blur
                      active:scale-[0.98]
                    "
                  >
                    Ambil Ulang
                  </button>

                  <button
                    type="button"
                    onClick={saveImage}
                    className="
                      flex-1
                      rounded-2xl
                      bg-white
                      px-4
                      py-4
                      text-sm
                      font-semibold
                      text-black
                      active:scale-[0.98]
                    "
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
