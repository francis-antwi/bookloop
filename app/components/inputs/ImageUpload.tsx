'use client';

import { CldUploadWidget } from 'next-cloudinary';
import { useCallback } from 'react';
import { TbPhotoPlus } from 'react-icons/tb';
import Image from 'next/image';

interface CloudinaryResult {
  info: {
    secure_url: string;
  };
}

interface ImageUploadProps {
  value: string[]; // Always treated as an array
  onChange: (value: string[]) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange }) => {
  const handleUpload = useCallback(
    (result: CloudinaryResult) => {
      const url = result.info.secure_url;
      if (!url) return;

      const updatedImages = [...value, url];
      onChange(updatedImages);
    },
    [onChange, value]
  );

  return (
    <CldUploadWidget
      onUpload={handleUpload}
      uploadPreset="dhfdtefhl"
      options={{ maxFiles: 10 }}
    >
      {({ open }) => {
        const handleClick = () => {
          if (typeof open === 'function') {
            open();
          }
        };

        return (
          <div
            onClick={handleClick}
            className="
              relative
              cursor-pointer
              hover:opacity-70
              transition
              border-dashed
              border-2
              p-20
              border-neutral-300
              flex
              flex-col
              justify-center
              items-center
              gap-4
              text-neutral-600
            "
          >
            <TbPhotoPlus size={50} />
            <div className="font-semibold text-lg">Click to upload</div>

            {value.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap justify-center">
                {value.map((url, index) => (
                  <div
                    key={index}
                    className="relative w-24 h-24 rounded-md overflow-hidden border border-neutral-300"
                  >
                    <Image
                      fill
                      alt={`Upload Preview ${index}`}
                      src={url}
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }}
    </CldUploadWidget>
  );
};

export default ImageUpload;
