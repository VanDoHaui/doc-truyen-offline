const saveToMemory = () => {
    if (!dbReady || !dbRef.current) {
      console.warn('IndexedDB chưa sẵn sàng');
      return;
    }
    
    try {
      const data = { 
        id: 'appData',
        darkMode, 
        chapters, 
        currentChapter, 
        fontSize, 
        lineHeight,
        timestamp: Date.now()
      };
      
      const sizeInMB = (JSON.stringify(data).length / (1024 * 1024)).toFixed(2);
      console.log(`💾 Lưu ${data.chapters.length} chương (${sizeInMB}MB) vào IndexedDB`);
      
      const transaction = dbRef.current.transaction(['readerData'], 'readwrite');
      const store = transaction.objectStore('readerData');
      const request = store.put(data);
      
      request.onsuccess = () => {
        appDataRef.current = data;
        console.log('✅ Lưu IndexedDB thành công');
      };
      
      request.onerror = () => {
        console.error('❌ Lỗi lưu IndexedDB');
        showToast('❌ Lỗi lưu dữ liệu');
      };
      
    } catch (error) {
      console.error('Save error:', error);
      showToast('❌ Lỗi lưu dữ liệu');
    }
  };
