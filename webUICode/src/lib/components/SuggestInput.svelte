<!-- SuggestInput.svelte -->
<script lang="ts" module>
  let inputValue = '';
  export const getInputValue = ()=>inputValue

</script>
<script lang="ts">
  import { onMount } from 'svelte';

  /** 数据源：建议列表 */
  export let options = [];

  /** 占位符文本 */
  export let placeholder = '请输入...';

  /** 防抖延迟（ms） */
  export let debounceDelay = 150;

  /** 最大显示条数（0表示不限制） */
  export let maxItems = 0;


  let filteredOptions = [];
  let isListVisible = false;
  let selectedIndex = -1;
  let inputElement:HTMLInputElement;
  let listElement:HTMLUListElement;

  let debounceTimer:any;
  //let outsideClickHandler;

  // 过滤建议（不区分大小写）
  function filterOptions(query) {
    if (!query.trim()) return [...options];
    const lowerQuery = query.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(lowerQuery));
  }

  // 高亮匹配文本
  function highlightMatch(text, query) {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 渲染建议列表
  function updateList() {
    const filtered = filterOptions(inputValue);
    filteredOptions = maxItems > 0 ? filtered.slice(0, maxItems) : filtered;
    isListVisible = true;
    selectedIndex = -1;
  }

  function debouncedUpdate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      updateList();
    }, debounceDelay);
  }

  function selectValue(value) {
    //
    inputElement.value = value
    inputValue = value;
    isListVisible = false;
    inputElement.focus();
    // 可选：派发自定义事件
    dispatchEvent('select', { value });
  }

  function hideList() {
    isListVisible = false;
    selectedIndex = -1;
  }

  // 键盘导航
  function handleKeydown(e) {
    if (!isListVisible) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        updateList();
      }
      return;
    }

    const items = document.querySelectorAll('[data-suggest-item]');
    const total = items.length;
    if (total === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (selectedIndex >= 0) items[selectedIndex]?.classList.remove('selected');
        selectedIndex = (selectedIndex + 1) % total;
        items[selectedIndex]?.classList.add('selected');
        items[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (selectedIndex >= 0) items[selectedIndex]?.classList.remove('selected');
        selectedIndex = (selectedIndex - 1 + total) % total;
        items[selectedIndex]?.classList.add('selected');
        items[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        break;
      case 'Enter':
        e.preventDefault();
        //console.log("enter",selectedIndex)
        if (selectedIndex >= 0) {
          const selectedValue = items[selectedIndex]?.getAttribute('data-value');
          if (selectedValue) selectValue(selectedValue);
        //}else{
          //console.log("end")
        }
        break;
      case 'Escape':
        hideList();
        inputElement.blur();
        break;
    }
  }

  // 外部点击关闭
  function handleOutsideClick(e) {
    if (!inputElement.contains(e.target) && !listElement?.contains(e.target)) {
      hideList();
    }
  }

  // 派发自定义事件
  function dispatchEvent(name, detail) {
    const event = new CustomEvent(name, { detail });
    inputElement.dispatchEvent(event);
  }

  onMount(() => {
    //const outsideClickHandler = handleOutsideClick;
    document.addEventListener('click', handleOutsideClick);
    return ()=>{
        clearTimeout(debounceTimer);
        document.removeEventListener('click', handleOutsideClick);
    }
  });
 
</script>

<!-- 样式 -->
<style>
  .suggest-container {
    position: relative;
    width: 100%;
  }
  @media (max-width: 700px) {
    .suggest-input {
        flex: 1;
        width: auto;
    }
  }
  .suggest-input {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 20px;
    padding: 8px 3px;
    font-size: 15px;
    color: white; 
    outline: none;
    width: 100%;
    transition: all 0.2s;
    backdrop-filter: blur(4px);
  }

  .suggest-input:focus {
       border-color: #6ab0ff;
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 6px #6ab0ff80;
  }
.suggest-input::placeholder {
    color: #bbd9ffaa;
    font-size: 12px;
}
  .suggest-list {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    max-height: 240px;
    overflow-y: auto;
    z-index: 1000;
    list-style: none;
    margin: 0;
    padding: 8px 0;
    border: 1px solid #e9edf2;
    display: none;
  }

  .suggest-list.show {
    display: block;
  }

  .suggest-item {
    padding: 6px 2px;
    font-size: 16px;
    cursor: pointer;
    transition: background 0.1s;
    color: #1e2a3a;
    /* 主动告知浏览器该区域滚动优先，消除 passive 警告 */
    touch-action: pan-y;
  }

  .suggest-item:active {
    background-color: #eef2f6;
  }

  @media (hover: hover) {
    .suggest-item:hover {
      background-color: #f0f4f8;
    }
  }

  .suggest-item.selected {
    background-color: #eef2ff;
  }

  .suggest-item mark {
    background-color: #ffea9f;
    color: inherit;
    border-radius: 4px;
    padding: 0 2px;
  }

  .suggest-list::-webkit-scrollbar {
    width: 6px;
  }

  .suggest-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 8px;
  }

  .suggest-list::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 8px;
  }
</style>

<div class="suggest-container">
  <input
    bind:this={inputElement}
    type="text"
    class="suggest-input"
    placeholder={placeholder}
    autocomplete="off"
    bind:value={inputValue}
    on:input={debouncedUpdate}
    on:focus={updateList}
    on:keydown={handleKeydown}
  />
  <ul
    bind:this={listElement}
    class="suggest-list"
    class:show={isListVisible}
  >
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    {#if filteredOptions.length === 0}
      <li class="suggest-item selected" style="color: #94a3b8; cursor: default;">
        <mark></mark> 
      </li>
    {:else}
    
      {#each filteredOptions as item, idx (item)} 
        <li
          class="suggest-item"
          data-value={item}
          data-suggest-item
          on:click={() => selectValue(item)}
          on:touchstart|passive
        >
          {@html highlightMatch(item, inputValue)}
        </li>
      {/each}
    {/if}
  </ul>
</div>