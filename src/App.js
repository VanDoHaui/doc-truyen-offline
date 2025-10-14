import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Upload, Menu, X, BookOpen, Download, FileUp, Save, Database, Trash2 } from 'lucide-react';
import mammoth from 'mammoth';

export default function OfflineReaderApp() {
  const [darkMode, setDarkMode] = useState(false);
  const [chapters, setChapters] = useState([
    {
      id: 1,
      title: 'Overgeared',
      content: `
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 60px 20px; min-height: 100vh; margin: -20px -20px -20px -20px; border-radius: 0;">
          <div style="max-width: 900px; margin: 0 auto; display: flex; gap: 40px; align-items: center;">
          <a href="https://ibb.co/JRFBcYZg"><img src="https://i.ibb.co/vxvwcN9R/03ld0idgkjv71.png" alt="03ld0idgkjv71" style="width: 280px; height: 400px; object-fit: cover; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); flex-shrink: 0;" /></a>
            <img src="https://ibb.co/JRFBcYZg" alt="Overgeared" style="width: 280px; height: 400px; object-fit: cover; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); flex-shrink: 0;" />
            <div style="flex: 1; color: white;">
              <h1 style="font-size: 3em; margin: 12px 0 20px 0; font-weight: 700; color: white;">Overgeared</h1>
              <p style="font-size: 1em; color: #e2e8f0; margin: 12px 0;"><strong>Author:</strong> Park Saenal (박새날)</p>
              <p style="font-size: 1em; color: #e2e8f0; margin: 12px 0;"><strong>Translator:</strong> rainbowturtle</p>
              <p style="font-size: 0.95em; line-height: 1.6; color: #cbd5e1; margin-top: 20px;">
                Shin Youngwoo has had an unfortunate life and is now stuck carrying bricks on construction sites. He even had to do labor in the VR game, Satisfy!...
              </p>
              <button id="readingButton" style="margin-top: 28px; background: #3b82f6; color: white; border: none; padding: 16px 48px; border-radius: 8px; font-size: 1.1em; font-weight: 600; cursor: pointer; width: 100%; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); transition: all 0.3s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                START READING
              </button>
            </div>
          </div>
        </div>
      `
    }
  ]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [dragOver, setDragOver] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [jumpPage, setJumpPage] = useState('');
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const contentRef = useRef(null);
  const appDataRef = useRef({ darkMode: true, chapters: [], currentChapter: 0, fontSize: 18, lineHeight: 1.8 });

  useEffect(() => {
    setMounted(true);
    loadFromMemory();
  }, []);

  const loadFromMemory = () => {
    const data = appDataRef.current;
    if (data.chapters && data.chapters.length > 0) {
      setDarkMode(data.darkMode);
      setChapters(data.chapters);
      setCurrentChapter(data.currentChapter);
      setFontSize(data.fontSize);
      setLineHeight(data.lineHeight);
      
      // Cập nhật nút khi load lại
      setTimeout(() => {
        const btn = document.getElementById('readingButton');
        if (btn && data.currentChapter === 0) {
          if (data.chapters.length > 1) {
            btn.textContent = 'CONTINUE READING';
            btn.onclick = () => changeChapter(data.currentChapter > 0 ? data.currentChapter : 1);
          }
        }
      }, 100);
    }
  };

  const saveToMemory = () => {
    appDataRef.current = { darkMode, chapters, currentChapter, fontSize, lineHeight };
  };

  useEffect(() => {
    if (mounted && chapters.length > 0) {
      const timer = setTimeout(() => saveToMemory(), 500);
      return () => clearTimeout(timer);
    }
  }, [darkMode, chapters, currentChapter, fontSize, lineHeight, mounted]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setShowHeader(true);
    setLastScrollY(0);
    
    // Cập nhật nút START/CONTINUE READING
    const btn = document.getElementById('readingButton');
    if (btn && currentChapter === 0) {
      if (chapters.length > 1) {
        btn.textContent = 'CONTINUE READING';
        btn.onclick = () => changeChapter(1);
      } else {
        btn.textContent = 'START READING';
        btn.onclick = () => changeChapter(1);
      }
    }
  }, [currentChapter, chapters.length]);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (currentScrollY < 100) {
            setShowHeader(true);
          } else if (currentScrollY > lastScrollY && currentScrollY > 150) {
            setShowHeader(false);
          } else if (currentScrollY < lastScrollY) {
            setShowHeader(true);
          }
          
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showMenu || showJumpModal) return;
      
      if (e.key === 'ArrowLeft' && currentChapter > 0) {
        e.preventDefault();
        changeChapter(currentChapter - 1);
      } else if (e.key === 'ArrowRight' && currentChapter < chapters.length - 1) {
        e.preventDefault();
        changeChapter(currentChapter + 1);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapter, chapters.length, showMenu, showJumpModal]);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2500);
  };

  const changeChapter = (newIndex) => {
    if (newIndex < 0) {
      showToast('⚠️ Đây là chương đầu');
      return;
    }
    if (newIndex >= chapters.length) {
      showToast('⚠️ Hết chương rồi');
      return;
    }
    setCurrentChapter(newIndex);
    window.scrollTo(0, 0);
  };

  const processFiles = async (files) => {
    setLoading(true);
    let successCount = 0;
    const newChapters = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        setProgress(Math.round(((i + 1) / files.length) * 100));
        const arrayBuffer = await files[i].arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        let html = result.value.replace(/<img[^>]*>/g, '').replace(/<p>\s*<\/p>/g, '');
        
        // Xóa từ dòng "←Trước Bình ↓ luận Kế→" trở xuống hết
        const indexTruoc = html.indexOf('←');
        const indexKe = html.indexOf('Kế');
        if (indexTruoc !== -1 && indexKe !== -1 && indexKe > indexTruoc) {
          // Tìm thẻ <p> bắt đầu chứa "←Trước"
          let startIndex = html.lastIndexOf('<p', indexTruoc);
          if (startIndex !== -1) {
            html = html.substring(0, startIndex);
          }
        }
        
        // Xóa các dòng chỉ chứa dấu chấm (bullets)
        html = html.replace(/<p>[\s·•∙․⋅]*<\/p>/g, '');
        html = html.replace(/<p>\s*\.\s*<\/p>/g, '');
        html = html.replace(/<p>\s*\.\s*\.\s*<\/p>/g, '');
        html = html.replace(/<p>\s*\.\s*\.\s*\.\s*<\/p>/g, '');
        html = html.replace(/<p>\s*\.\s*\.\s*\.\s*\.\s*<\/p>/g, '');
        
        // Xóa các thẻ <hr>, <hr/>, và dòng kẻ ngang
        html = html.replace(/<hr\s*\/?>/g, '');
        html = html.replace(/<p>\s*[-─═_]+\s*<\/p>/g, '');
        
        // Xóa các thẻ <p> trống
        html = html.replace(/<p>\s*<\/p>/g, '');
        
        html = html.replace(/<table[^>]*>(.*?)<\/table>/gs, (match, content) => {
          let cleanContent = content
            .replace(/<\/?tbody[^>]*>/g, '')
            .replace(/<tr[^>]*>/g, '')
            .replace(/<\/tr>/g, '')
            .replace(/<td[^>]*>/g, '<p>')
            .replace(/<\/td>/g, '</p>');
          return `<div class="info-box">${cleanContent}</div>`;
        });
        
        html = html.replace(/<p>(Tên|Cấp độ|Lớp nghề|Danh hiệu)\s*:\s*([^<]+)<\/p>/g, 
          '<div class="char-stat"><span class="char-label">$1</span><span class="char-sep">:</span><span class="char-value">$2</span></div>');
        
        html = html.replace(/^\[([^\]]+)\]$/gm, '<div class="section-title">[$1]</div>');
        
        html = html.replace(/<p>([^<:]+)\s*:\s*([^<]+)<\/p>/g, (match, label, value) => {
          if (label.includes('[') || label.includes(']') || label.trim().length < 2) {
            return match;
          }
          return `<div class="stat-line" data-label="${label.trim()}" data-value="${value.trim()}"></div>`;
        });
        
        html = html.replace(/(<div class="stat-line"[^>]*><\/div>\s*)+/g, (match) => {
          const statMatches = match.matchAll(/<div class="stat-line" data-label="([^"]*)" data-value="([^"]*)"><\/div>/g);
          const stats = Array.from(statMatches).map(m => ({ label: m[1], value: m[2] }));
          
          if (stats.length === 0) return match;
          
          const midPoint = Math.ceil(stats.length / 2);
          const col1 = stats.slice(0, midPoint);
          const col2 = stats.slice(midPoint);
          
          let gridHTML = '<div class="stats-grid-container"><div class="stats-column">';
          col1.forEach(stat => {
            gridHTML += `<div class="detail-stat"><span class="detail-label">${stat.label}</span><span class="detail-sep">:</span><span class="detail-value">${stat.value}</span></div>`;
          });
          gridHTML += '</div><div class="stats-column">';
          col2.forEach(stat => {
            gridHTML += `<div class="detail-stat"><span class="detail-label">${stat.label}</span><span class="detail-sep">:</span><span class="detail-value">${stat.value}</span></div>`;
          });
          gridHTML += '</div></div>';
          
          return gridHTML;
        });
        
        html = html.replace(/\[([^\]]+)\]/g, '<span class="item-name">[$1]</span>');
        html = html.replace(/Xếp hạng\s*:\s*([^\n<]+)/gi, '<div class="stat-row"><span class="stat-label">Xếp hạng:</span><span class="stat-value">$1</span></div>');
        html = html.replace(/Độ bền\s*:\s*([^\n<]+)/gi, '<div class="stat-row"><span class="stat-label">Độ bền:</span><span class="stat-value">$1</span></div>');
        html = html.replace(/Sức Tấn công\s*:\s*([^\n<]+)/gi, '<div class="stat-row"><span class="stat-label">Tấn công:</span><span class="stat-value">$1</span></div>');
        html = html.replace(/Tốc độ tấn công\s*:\s*([^\n<]+)/gi, '<div class="stat-row"><span class="stat-label">Tốc độ:</span><span class="stat-value">$1</span></div>');
        
        newChapters.push({
          id: Date.now() + Math.random(),
          title: files[i].name.replace(/\.(docx|doc)$/, ''),
          content: html
        });
        successCount++;
      } catch (error) {
        console.error('Lỗi:', error);
      }
    }
    
    setChapters(prev => [...prev, ...newChapters]);
    setLoading(false);
    setProgress(0);
    showToast(`✅ Thêm ${successCount} chương`);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.docx') || f.name.endsWith('.doc'));
    if (files.length === 0) return showToast('⚠️ Chỉ nhận file .docx');
    if (chapters.length + files.length > 3000) return showToast('⚠️ Vượt 3000 chương!');
    await processFiles(files);
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files).filter(f => f.name.endsWith('.docx') || f.name.endsWith('.doc'));
    if (files.length === 0) return showToast('⚠️ Chỉ nhận file .docx');
    if (chapters.length + files.length > 3000) return showToast('⚠️ Vượt 3000 chương!');
    await processFiles(files);
    event.target.value = '';
  };

  const deleteChapter = (chapterId) => {
    if (chapters.length <= 1) return showToast('⚠️ Không xóa được chương cuối');
    const newChapters = chapters.filter(ch => ch.id !== chapterId);
    setChapters(newChapters);
    if (currentChapter >= newChapters.length) setCurrentChapter(newChapters.length - 1);
    showToast('🗑️ Đã xóa');
  };

  const filteredChapters = chapters.filter(ch => 
    ch.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportData = () => {
    try {
      const blob = new Blob([JSON.stringify({ darkMode, chapters, currentChapter, fontSize, lineHeight }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✅ Đã xuất!');
    } catch (error) {
      showToast('❌ Lỗi xuất');
    }
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        const data = JSON.parse(e.target.result);
        if (!data.chapters || !Array.isArray(data.chapters)) return showToast('❌ File không hợp lệ');
        setDarkMode(data.darkMode !== undefined ? data.darkMode : true);
        setChapters(data.chapters);
        setCurrentChapter(data.currentChapter || 0);
        setFontSize(data.fontSize || 18);
        setLineHeight(data.lineHeight || 1.8);
        appDataRef.current = data;
        showToast(`✅ Nhập ${data.chapters.length} chương!`);
      } catch (error) {
        showToast('❌ File lỗi');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`} style={{ touchAction: 'pan-y' }}>
      {loading && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-xs w-full mx-4 text-center`}>
            <div className="text-3xl mb-3">📚</div>
            <p className="font-bold mb-3">{progress > 0 ? `${progress}%` : 'Đang tải...'}</p>
            {progress > 0 && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{width: `${progress}%`}}></div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} fixed top-0 left-0 right-0 z-20 shadow-sm`}>
        <div className="max-w-5xl mx-auto px-3 py-3 flex items-center justify-between">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            {showMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold truncate px-2">
              {chapters[currentChapter]?.title}
            </h1>
            <p className="text-xs opacity-60">
              {currentChapter + 1} / {chapters.length}
            </p>
          </div>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setShowMenu(false)}></div>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} fixed top-0 left-0 bottom-0 w-80 z-40 overflow-y-auto`}>
            <div className="p-4 space-y-4">
              <div 
                onClick={() => {
                  setShowMenu(false);
                }}
                className={`p-4 rounded-lg ${darkMode ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gradient-to-r from-blue-500 to-purple-500'} cursor-pointer hover:opacity-90 transition-all`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen size={18} className="text-white" />
                  <span className="text-white font-bold text-sm">Đọc tiếp</span>
                </div>
                <div className="text-white font-medium truncate">{chapters[currentChapter]?.title}</div>
                <div className="text-white/80 text-xs mt-1">
                  Chương {currentChapter + 1} / {chapters.length}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="🔍 Tìm chương..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-0 outline-none`}
                />
                <div className="text-xs mt-2 opacity-60">
                  {chapters.length} / 3000 chương
                </div>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      chapters.findIndex(c => c.id === ch.id) === currentChapter
                        ? 'bg-blue-600 text-white'
                        : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div 
                      onClick={() => {
                        changeChapter(chapters.findIndex(c => c.id === ch.id));
                        setShowMenu(false);
                      }}
                      className="flex-1 text-sm cursor-pointer truncate"
                    >
                      {ch.title}
                    </div>
                    <button
                      onClick={() => deleteChapter(ch.id)}
                      className="p-1 hover:bg-red-500/30 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Cỡ chữ: {fontSize}px</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                    className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize(18)}
                    className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    Mặc định
                  </button>
                  <button
                    onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                    className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    A+
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Giãn dòng: {lineHeight.toFixed(1)}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLineHeight(Math.max(1.2, lineHeight - 0.2))}
                    className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    Giảm
                  </button>
                  <button
                    onClick={() => setLineHeight(1.8)}
                    className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    Mặc định
                  </button>
                  <button
                    onClick={() => setLineHeight(Math.min(2.5, lineHeight + 0.2))}
                    className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    Tăng
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowJumpModal(true);
                  setShowMenu(false);
                }}
                className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center justify-center gap-2"
              >
                <BookOpen size={18} />
                Nhảy tới chương
              </button>

              <label className="block">
                <input
                  type="file"
                  accept=".docx,.doc"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium cursor-pointer flex items-center justify-center gap-2">
                  <Upload size={18} />
                  Thêm chương
                </div>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={exportData}
                  className="py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center justify-center gap-1"
                >
                  <Download size={16} />
                  Xuất
                </button>
                <label>
                  <input type="file" accept=".json" onChange={importData} className="hidden" />
                  <div className="py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm cursor-pointer flex items-center justify-center gap-1">
                    <FileUp size={16} />
                    Nhập
                  </div>
                </label>
                <button
                  onClick={() => {
                    saveToMemory();
                    showToast('✅ Đã lưu!');
                  }}
                  className="py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-sm flex items-center justify-center gap-1"
                >
                  <Save size={16} />
                  Lưu
                </button>
                <button
                  onClick={() => {
                    const data = appDataRef.current;
                    showToast(data.chapters?.length > 0 ? `📦 ${data.chapters.length} chương` : '⚠️ Trống');
                  }}
                  className="py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm flex items-center justify-center gap-1"
                >
                  <Database size={16} />
                  Kiểm tra
                </button>
              </div>

              {chapters.length > 10 && (
                <button
                  onClick={() => {
                    if (window.confirm('Xóa tất cả?')) {
                      setChapters([{ id: 1, title: 'Chương mẫu', content: '<p>Đã xóa!</p>' }]);
                      setCurrentChapter(0);
                      appDataRef.current = { darkMode: true, chapters: [], currentChapter: 0, fontSize: 18, lineHeight: 1.8 };
                      showToast('🗑️ Đã xóa');
                    }
                  }}
                  className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm"
                >
                  🗑️ Xóa tất cả
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div
        ref={contentRef}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            e.currentTarget.style.touchAction = 'pan-y';
          }
        }}
        className="max-w-4xl mx-auto px-4 pt-20 pb-8 min-h-screen"
        style={{ touchAction: 'pan-y' }}
      >
        {dragOver && (
          <div className="fixed inset-4 border-4 border-dashed border-blue-500 rounded-xl bg-blue-500/10 flex items-center justify-center z-30">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-6 py-4 rounded-xl`}>
              <Upload size={40} className="mx-auto mb-2 text-blue-500" />
              <p className="font-bold">Thả file vào đây!</p>
            </div>
          </div>
        )}

        <style>{`
          .section-title {
            background: ${darkMode ? 'linear-gradient(135deg, #1e3a8a 0%, #6366f1 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'};
            color: ${darkMode ? '#e0e7ff' : 'white'};
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 1.1em;
            text-align: center;
            margin: 20px 0 12px 0;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .stats-grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin: 12px 0;
            padding: 12px;
            background: ${darkMode ? '#0f172a' : '#f8fafc'};
            border-radius: 8px;
            border: 1px solid ${darkMode ? '#1e293b' : '#e2e8f0'};
            line-height: 1.4 !important;
          }
          @media (max-width: 768px) {
            .stats-grid-container {
              grid-template-columns: 1fr;
            }
          }
          .stats-column {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .detail-stat {
            display: grid;
            grid-template-columns: 110px 15px 1fr;
            padding: 8px 10px;
            background: ${darkMode ? '#1e293b' : '#ffffff'};
            align-items: center;
            font-size: 0.9em;
            border-radius: 4px;
            border: 1px solid ${darkMode ? '#334155' : '#e2e8f0'};
            line-height: 1.3 !important;
          }
          .detail-stat:hover {
            background: ${darkMode ? '#334155' : '#f1f5f9'};
            border-color: ${darkMode ? '#475569' : '#cbd5e1'};
          }
          .detail-label {
            font-weight: 600;
            color: ${darkMode ? '#94a3b8' : '#475569'};
            text-align: left;
            font-size: 0.9em;
          }
          .detail-sep {
            color: ${darkMode ? '#64748b' : '#94a3b8'};
            text-align: center;
            font-weight: 500;
          }
          .detail-value {
            color: ${darkMode ? '#a5b4fc' : '#4f46e5'};
            font-weight: 600;
            text-align: left;
            font-size: 0.95em;
          }
          .info-box {
            border: 2px solid ${darkMode ? '#334155' : '#cbd5e1'};
            background: ${darkMode ? '#1e293b' : '#f8fafc'};
            border-radius: 8px;
            padding: 12px 16px;
            margin: 16px 0;
            line-height: 1.5 !important;
          }
          .info-box p {
            margin: 8px 0;
            color: ${darkMode ? '#cbd5e1' : '#475569'};
          }
          .info-box p:first-child {
            margin-top: 0;
          }
          .info-box p:last-child {
            margin-bottom: 0;
          }
          .info-box strong {
            color: ${darkMode ? '#818cf8' : '#4f46e5'};
          }
          .char-stat {
            display: grid;
            grid-template-columns: 100px 20px 1fr;
            padding: 12px 16px;
            border: 1px solid ${darkMode ? '#334155' : '#cbd5e1'};
            background: ${darkMode ? '#1e293b' : '#ffffff'};
            margin: 0;
            align-items: center;
            font-size: 1em;
            line-height: 1.4 !important;
          }
          .char-stat:first-of-type {
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
          }
          .char-stat:last-of-type {
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
          }
          .char-stat + .char-stat {
            border-top: none;
          }
          .char-stat:hover {
            background: ${darkMode ? '#334155' : '#f8fafc'};
          }
          .char-label {
            font-weight: 700;
            color: ${darkMode ? '#818cf8' : '#4f46e5'};
            text-align: left;
          }
          .char-sep {
            color: ${darkMode ? '#64748b' : '#94a3b8'};
            text-align: center;
            font-weight: 500;
          }
          .char-value {
            color: ${darkMode ? '#a5b4fc' : '#6366f1'};
            font-weight: 600;
            text-align: left;
          }
          .item-name {
            display: inline-block;
            background: ${darkMode ? '#334155' : '#3b82f6'};
            color: ${darkMode ? '#cbd5e1' : 'white'};
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.95em;
            margin: 4px 0;
          }
          .stat-row {
            display: flex;
            padding: 6px 12px;
            border-bottom: 1px solid ${darkMode ? '#334155' : '#e5e7eb'};
            background: ${darkMode ? '#1e293b' : '#f9fafb'};
            margin: 2px 0;
          }
          .stat-label {
            font-weight: 600;
            min-width: 100px;
            color: ${darkMode ? '#94a3b8' : '#6b7280'};
          }
          .stat-value {
            flex: 1;
            color: ${darkMode ? '#cbd5e1' : '#374151'};
          }
        `}</style>

        <div
          className="prose prose-lg max-w-none"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeight}`,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}
          dangerouslySetInnerHTML={{ __html: chapters[currentChapter]?.content }}
        />
        
        <div className="flex justify-between items-center mt-12 pt-6 border-t" style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}>
          {currentChapter > 0 ? (
            <button
              onClick={() => changeChapter(currentChapter - 1)}
              className={`px-6 py-3 rounded-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} shadow-md flex items-center gap-2 transition-all`}
            >
              <span className="font-bold text-xl">&lt;</span>
              <span className="text-base">Chương trước</span>
            </button>
          ) : <div></div>}
          
          {currentChapter < chapters.length - 1 ? (
            <button
              onClick={() => changeChapter(currentChapter + 1)}
              className={`px-6 py-3 rounded-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} shadow-md flex items-center gap-2 transition-all`}
            >
              <span className="text-base">Chương sau</span>
              <span className="font-bold text-xl">&gt;</span>
            </button>
          ) : <div></div>}
        </div>
      </div>

      {showJumpModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowJumpModal(false)}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-sm w-full`} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">Nhảy tới chương</h3>
            <input
              type="number"
              min="1"
              max={chapters.length}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              placeholder={`1-${chapters.length}`}
              className={`w-full px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} mb-3`}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const num = parseInt(jumpPage);
                  if (num >= 1 && num <= chapters.length) {
                    changeChapter(num - 1);
                    setShowJumpModal(false);
                    setJumpPage('');
                  }
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const num = parseInt(jumpPage);
                  if (num >= 1 && num <= chapters.length) {
                    changeChapter(num - 1);
                    setShowJumpModal(false);
                    setJumpPage('');
                  }
                }}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Đi tới
              </button>
              <button
                onClick={() => {
                  setShowJumpModal(false);
                  setJumpPage('');
                }}
                className={`flex-1 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} font-medium`}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-4 py-2 rounded-lg shadow-lg`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
