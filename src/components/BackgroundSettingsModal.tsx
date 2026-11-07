import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Sliders, Check, RotateCcw, Upload, Sparkles } from 'lucide-react';
import { BackgroundSettings, PRESET_BACKGROUNDS, DEFAULT_BG_SETTINGS } from '../types';
import { compressImageFile } from '../services/storage';

interface BackgroundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: BackgroundSettings;
  onSaveSettings: (settings: BackgroundSettings) => void;
}

export const BackgroundSettingsModal: React.FC<BackgroundSettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSaveSettings,
}) => {
  const [settings, setSettings] = useState<BackgroundSettings>(currentSettings);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_BACKGROUNDS[0]) => {
    if (preset.type === 'gradient') {
      setSettings({
        ...settings,
        type: 'gradient',
        imageUrl: '',
      });
    } else {
      setSettings({
        ...settings,
        type: 'image',
        imageUrl: preset.url,
      });
    }
  };

  const handleCustomFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const compressed = await compressImageFile(file, 1920, 0.85);
      setSettings({
        ...settings,
        type: 'image',
        imageUrl: compressed,
      });
    } catch (err) {
      console.warn('Lỗi khi nén ảnh hình nền:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      setSettings({
        ...settings,
        type: 'image',
        imageUrl: customUrlInput.trim(),
      });
      setCustomUrlInput('');
    }
  };

  const handleSave = () => {
    onSaveSettings(settings);
    onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_BG_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-7 max-w-xl w-full border border-[#8C6D58]/20 shadow-2xl relative my-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D98A76] bg-[#E8A598]/15 px-3 py-1 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Không Gian Kỷ Niệm</span>
          </div>
          <h2 className="font-serif-romantic text-2xl sm:text-3xl font-bold text-[#3D2E28]">
            Đổi Hình Nền Góc Nhỏ
          </h2>
          <p className="text-xs text-[#8C6D58] mt-1">
            Chọn hình nền phong cảnh nên thơ hoặc tải ảnh riêng của hai đứa để trang web thêm ấm áp
          </p>
        </div>

        <div className="space-y-5">
          {/* Preset Backgrounds */}
          <div>
            <label className="block text-xs font-semibold text-[#8C6D58] mb-2">
              Bộ sưu tập hình nền có sẵn
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PRESET_BACKGROUNDS.map((preset) => {
                const isSelected =
                  preset.type === 'gradient'
                    ? settings.type === 'gradient'
                    : settings.type === 'image' && settings.imageUrl === preset.url;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`relative rounded-xl overflow-hidden p-2 text-left border-2 transition-all group ${
                      isSelected
                        ? 'border-[#D98A76] ring-2 ring-[#E8A598]/40 shadow-sm'
                        : 'border-[#8C6D58]/15 hover:border-[#E8A598]'
                    }`}
                  >
                    <div
                      className="w-full h-16 rounded-lg bg-cover bg-center mb-1.5 shadow-inner"
                      style={{
                        background:
                          preset.type === 'gradient'
                            ? preset.preview
                            : `url(${preset.preview}) center/cover no-repeat`,
                      }}
                    />
                    <div className="text-[11px] font-medium text-[#3D2E28] truncate">
                      {preset.name}
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-[#D98A76] text-white p-1 rounded-full shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tải ảnh riêng hoặc nhập URL */}
          <div className="bg-[#F9F6F0] rounded-2xl p-4 border border-[#8C6D58]/15 space-y-3">
            <label className="block text-xs font-semibold text-[#8C6D58]">
              Hoặc tải ảnh nền riêng của hai đứa
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomFileUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-[#FAF6F0] text-[#3D2E28] border border-[#8C6D58]/20 shadow-xs transition-all"
              >
                <Upload className="w-4 h-4 text-[#D98A76]" />
                <span>{isUploading ? 'Đang nén ảnh...' : 'Chọn ảnh từ thiết bị'}</span>
              </button>

              <div className="flex-1 flex gap-1.5">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="Hoặc dán URL ảnh nền..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#E8A598] hover:bg-[#D98A76] text-white"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>

          {/* Điều chỉnh Độ Mờ & Độ Đậm Nhạt của hình nền */}
          {settings.type === 'image' && (
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-[#8C6D58] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#D98A76]" />
                    Độ trong suốt của hình nền ({Math.round(settings.opacity * 100)}%)
                  </span>
                  <span className="text-[11px] text-[#8C6D58]">
                    (Giúp chữ và ảnh kỷ niệm luôn rõ nét)
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.85"
                  step="0.05"
                  value={settings.opacity}
                  onChange={(e) =>
                    setSettings({ ...settings, opacity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#D98A76] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-[#8C6D58] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#D98A76]" />
                    Độ mờ hậu cảnh ({settings.blur}px)
                  </span>
                  <span className="text-[11px] text-[#8C6D58]">
                    (Làm mờ nhẹ để mắt luôn dịu)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="16"
                  step="1"
                  value={settings.blur}
                  onChange={(e) =>
                    setSettings({ ...settings, blur: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-[#D98A76] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#8C6D58]/10">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#8C6D58] hover:text-[#3D2E28]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mặc định</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#8C6D58] hover:bg-[#F9F6F0] rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#E8A598] hover:bg-[#D98A76] rounded-xl shadow-xs transition-all"
              >
                Lưu hình nền
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
