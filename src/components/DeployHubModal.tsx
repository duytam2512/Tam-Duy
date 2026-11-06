import React, { useState } from 'react';
import {
  Globe,
  Terminal,
  Server,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Search,
  CheckCircle2,
  FileCode,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface DeployHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeployHubModal: React.FC<DeployHubModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'seo' | 'console' | 'vercel' | 'github'>('seo');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Google Search Console verification state
  const [consoleCode, setConsoleCode] = useState<string>(() => {
    return localStorage.getItem('nhachungminh_gsc_code') || 'google-site-verification-nhachungminh';
  });
  const [isSavedCode, setIsSavedCode] = useState(false);

  if (!isOpen) return null;

  const copyText = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleSaveConsoleCode = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('nhachungminh_gsc_code', consoleCode.trim());
    // Update live DOM meta tag
    const metaTag = document.getElementById('google-search-console-meta');
    if (metaTag) {
      metaTag.setAttribute('content', consoleCode.trim());
    }
    setIsSavedCode(true);
    setTimeout(() => setIsSavedCode(false), 3000);
  };

  const currentOrigin = window.location.origin;
  const sitemapUrl = `${currentOrigin}/sitemap.xml`;
  const robotsUrl = `${currentOrigin}/robots.txt`;

  const gitCommands = `# 1. Khởi tạo kho lưu trữ Git cục bộ
git init

# 2. Thêm tất cả tệp nguồn dự án
git add .

# 3. Tạo commit đầu tiên
git commit -m "feat: Nhà chúng mình. Nơi bình yên của hai đứa"

# 4. Đặt nhánh chính là main
git branch -M main

# 5. Liên kết tới GitHub Repository của bạn (thay USERNAME/REPO)
git remote add origin https://github.com/USERNAME/nha-chung-minh.git

# 6. Đẩy mã nguồn lên GitHub
git push -u origin main`;

  const vercelCliCommands = `# Cài đặt Vercel CLI (nếu chưa cài)
npm i -g vercel

# Triển khai dự án lên Vercel
vercel --prod`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06120e]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[#0e241e] border border-emerald-700/50 rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-rose-500/20 border border-pink-400/30 text-rose-300 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Trung Tâm Google SEO, Search Console, Vercel & GitHub
              </h3>
              <p className="text-xs text-emerald-300/70">
                Nhà chúng mình. Nơi bình yên của hai đứa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-950 hover:bg-emerald-900 text-emerald-400 hover:text-white flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 pt-4 overflow-x-auto scrollbar-none">
          {[
            { id: 'seo', label: '🔍 Google SEO' },
            { id: 'console', label: '📊 Google Search Console' },
            { id: 'vercel', label: '▲ Triển khai Vercel' },
            { id: 'github', label: '🐙 Mã nguồn GitHub' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-600 to-rose-500 text-white shadow-md'
                  : 'bg-[#081813] text-emerald-300/70 hover:text-white border border-emerald-900/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto py-4 flex-1 space-y-4 pr-1 text-xs">
          {/* TAB 1: Google SEO */}
          {activeTab === 'seo' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-[#081813]/80 border border-emerald-800/50 space-y-2">
                <p className="font-bold text-white text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Đã cấu hình chuẩn Google SEO & Rich Snippets
                </p>
                <p className="text-emerald-300/80 leading-relaxed">
                  Ứng dụng đã được tích hợp đầy đủ các tiêu chuẩn tối ưu hóa công cụ tìm kiếm của Google (Googlebot, Mobile-first indexing, Core Web Vitals) để trang web được xếp hạng tốt nhất.
                </p>
              </div>

              {/* Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    title: 'Title Tag Tối Ưu',
                    desc: 'Nhà Chúng Mình • Nơi Bình Yên Của Hai Đứa (chuẩn 35-55 ký tự)',
                  },
                  {
                    title: 'Meta Description Hấp Dẫn',
                    desc: '150 ký tự tóm tắt trọn vẹn giá trị kỷ niệm quê hương.',
                  },
                  {
                    title: 'OpenGraph & Twitter Cards',
                    desc: 'Hiển thị thẻ xem trước ảnh đại diện đẹp mắt khi chia sẻ qua Zalo, Facebook, iMessage.',
                  },
                  {
                    title: 'Schema.org JSON-LD',
                    desc: 'Dữ liệu cấu trúc WebApplication giúp Google hiểu danh mục và tính năng.',
                  },
                  {
                    title: 'Sitemap XML Tự Động',
                    desc: 'Sơ đồ trang web chứa liên kết ảnh phục vụ Googlebot lập chỉ mục.',
                  },
                  {
                    title: 'Robots.txt Hợp Lệ',
                    desc: 'Cho phép thu thập dữ liệu công khai trên toàn bộ trang web.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#081813]/60 border border-emerald-800/40 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-100">{item.title}</p>
                      <p className="text-[11px] text-emerald-300/70 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Useful links */}
              <div className="p-3.5 rounded-2xl bg-[#081813] border border-emerald-800/50 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Sơ đồ trang web (Sitemap XML)</p>
                  <p className="text-[11px] text-emerald-400 font-mono mt-0.5">{sitemapUrl}</p>
                </div>
                <button
                  onClick={() => copyText(sitemapUrl, 'sitemap')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 font-semibold flex items-center gap-1.5"
                >
                  {copiedSection === 'sitemap' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'sitemap' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Google Search Console */}
          {activeTab === 'console' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-rose-950/40 border border-rose-500/30 space-y-2">
                <p className="font-bold text-white text-sm">
                  Hướng Dẫn Xác Minh Google Search Console
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-emerald-200/90 leading-relaxed text-xs">
                  <li>Truy cập <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-pink-300 underline font-bold">Google Search Console</a>.</li>
                  <li>Chọn <b>"Thêm thuộc tính" (Add Property)</b> và dán link trang web của bạn (URL Prefix).</li>
                  <li>Chọn phương thức xác minh: <b>"Thẻ HTML" (HTML tag)</b>.</li>
                  <li>Sao chép mã xác minh và dán vào ô bên dưới, sau đó bấm <b>"Lưu & Xác Minh"</b>.</li>
                  <li>Trong menu Search Console, vào mục <b>"Sơ đồ trang web" (Sitemaps)</b> và gửi: <code className="text-pink-300">sitemap.xml</code>.</li>
                </ol>
              </div>

              {/* Input for verification code */}
              <form onSubmit={handleSaveConsoleCode} className="p-4 rounded-2xl bg-[#081813] border border-emerald-800/60 space-y-3">
                <label className="block font-bold text-white text-xs">
                  Mã Xác Minh Google Search Console (google-site-verification)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={consoleCode}
                    onChange={e => setConsoleCode(e.target.value)}
                    placeholder="VD: google-site-verification=abcXYZ123..."
                    className="flex-1 bg-[#0e251f] border border-emerald-700/60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-emerald-500/50 font-mono focus:outline-none focus:border-pink-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-rose-500 hover:from-emerald-500 hover:to-rose-400 text-white font-bold transition-all shadow-md shrink-0"
                  >
                    Lưu Mã
                  </button>
                </div>
                {isSavedCode && (
                  <p className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Đã cập nhật mã xác minh vào thẻ meta trên trang web!
                  </p>
                )}
              </form>

              <div className="p-3.5 rounded-2xl bg-[#081813] border border-emerald-800/40 space-y-1">
                <p className="font-semibold text-white">Đường dẫn nộp Sitemap trong Search Console:</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="font-mono text-pink-300 text-[11px] truncate">{sitemapUrl}</span>
                  <button
                    onClick={() => copyText(sitemapUrl, 'sitemap2')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-900/60 text-emerald-200 text-[11px] font-semibold shrink-0"
                  >
                    {copiedSection === 'sitemap2' ? 'Đã chép' : 'Sao chép link'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Vercel */}
          {activeTab === 'vercel' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-[#081813]/90 border border-emerald-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-black text-[10px]">▲</span>
                    Triển Khai Miễn Phí Với Vercel (1-Click Deploy)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                    vercel.json Đã Sẵn Sàng
                  </span>
                </div>
                <p className="text-emerald-300/80 leading-relaxed text-xs">
                  Tệp <code>vercel.json</code> đã được tạo sẵn ở thư mục gốc với các quy tắc định tuyến SPA (Single Page Application) và bộ đệm CDN tối ưu tốc độ tải trang.
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {[
                  {
                    step: 'Bước 1',
                    title: 'Đẩy mã nguồn lên GitHub',
                    desc: 'Tạo một kho lưu trữ trên GitHub và đẩy mã nguồn theo tab GitHub bên cạnh.',
                  },
                  {
                    step: 'Bước 2',
                    title: 'Kết nối tài khoản tại Vercel.com',
                    desc: 'Đăng nhập Vercel bằng tài khoản GitHub, chọn "Add New Project" và chọn repo vừa tạo.',
                  },
                  {
                    step: 'Bước 3',
                    title: 'Nhấn Deploy',
                    desc: 'Vercel tự động nhận diện Vite (Build Command: npm run build, Output: dist). Chỉ sau 30 giây là có tên miền miễn phí .vercel.app!',
                  },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#081813]/60 border border-emerald-800/40 flex items-start gap-3"
                  >
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold shrink-0">
                      {s.step}
                    </span>
                    <div>
                      <p className="font-bold text-white">{s.title}</p>
                      <p className="text-[11px] text-emerald-300/70 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vercel CLI Box */}
              <div className="p-3.5 rounded-2xl bg-[#081813] border border-emerald-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Triển khai bằng Vercel CLI qua dòng lệnh:</span>
                  <button
                    onClick={() => copyText(vercelCliCommands, 'vercelCli')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-900/60 text-emerald-200 text-[11px] font-semibold flex items-center gap-1"
                  >
                    {copiedSection === 'vercelCli' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'vercelCli' ? 'Đã sao chép' : 'Sao chép lệnh'}</span>
                  </button>
                </div>
                <pre className="bg-[#050f0c] p-3 rounded-xl text-[11px] text-emerald-300 font-mono overflow-x-auto">
                  {vercelCliCommands}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: GitHub */}
          {activeTab === 'github' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-[#081813]/90 border border-emerald-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-rose-300" />
                    Lệnh Đẩy Mã Nguồn Lên GitHub
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">README.md Đã Có Sẵn</span>
                </div>
                <p className="text-emerald-300/80 leading-relaxed text-xs">
                  Sao chép các lệnh bên dưới và dán vào Terminal trên máy tính của bạn để đưa dự án lên GitHub ngay lập tức:
                </p>
              </div>

              <div className="relative">
                <pre className="bg-[#050f0c] border border-emerald-800/60 p-4 rounded-2xl text-[11px] text-emerald-200 font-mono overflow-x-auto leading-relaxed">
                  {gitCommands}
                </pre>
                <button
                  onClick={() => copyText(gitCommands, 'gitCommands')}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-rose-500 hover:from-emerald-500 hover:to-rose-400 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
                >
                  {copiedSection === 'gitCommands' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'gitCommands' ? 'Đã sao chép!' : 'Sao chép tất cả'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/30 text-[11px] text-emerald-300/80">
                💡 <b>Mẹo</b>: Sau khi đẩy lên GitHub, bạn có thể dễ dàng liên kết với Vercel để trang web tự động cập nhật mỗi khi bạn đẩy code mới!
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-emerald-800/50 bg-[#0a1a15]/90 flex items-center justify-between text-xs">
          <span className="text-emerald-300/70">
            Nhà chúng mình. Nơi bình yên của hai đứa
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-200 font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
