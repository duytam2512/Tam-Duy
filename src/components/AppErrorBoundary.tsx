import React from 'react';
import { RefreshCw, Heart } from 'lucide-react';

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AppErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Đã xảy ra sự cố hiển thị ngoài ý muốn.'
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('AppErrorBoundary caught error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCacheAndReload = () => {
    try {
      localStorage.removeItem('goc_nho_binh_yen_memories_v3');
      localStorage.removeItem('goc_nho_binh_yen_bg_v3');
      localStorage.removeItem('goc_nho_playlist');
    } catch {}
    try {
      if (typeof indexedDB !== 'undefined') {
        indexedDB.deleteDatabase('goc_nho_app_cache_v1');
      }
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-6 text-[#3D2E28]">
          <div className="max-w-md w-full bg-[#FFFDF9] rounded-3xl border border-[#8C6D58]/20 shadow-xl p-7 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#E8A598]/20 text-[#D98A76] flex items-center justify-center">
              <Heart className="w-7 h-7 fill-[#E8A598]" />
            </div>
            <h1 className="font-serif-romantic text-2xl font-bold text-[#3D2E28]">
              Góc Nhỏ đang cần tải lại
            </h1>
            <p className="text-xs text-[#8C6D58] leading-relaxed">
              Một thành phần trên trang vừa gặp trục trặc nhỏ. Dữ liệu kỷ niệm của hai bạn vẫn được
              lưu an toàn trên đám mây.
            </p>
            {this.state.errorMessage && (
              <div className="text-[11px] text-[#8C6D58] bg-[#FAF6F0] border border-[#8C6D58]/15 rounded-xl px-3 py-2 break-words">
                {this.state.errorMessage}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#D98A76] hover:bg-[#C87D55] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tải lại trang</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetCacheAndReload}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#F5EFE6] hover:bg-[#ECE2D4] text-[#8C6D58] text-xs font-semibold transition-colors cursor-pointer"
              >
                Làm mới bộ nhớ đệm
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
