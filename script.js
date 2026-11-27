(() => {
  'use strict';

  const STORAGE_KEY = 'gwaje-check-assignments-v1';
  const form = document.querySelector('#assignment-form');
  const list = document.querySelector('#assignment-list');
  const statusMessage = document.querySelector('#status-message');
  const dateInput = document.querySelector('#due-date');
  const todayElement = document.querySelector('#today-date');
  const counts = {
    remaining: document.querySelector('#remaining-count'),
    total: document.querySelector('#total-count'),
    all: document.querySelector('#all-count'),
    active: document.querySelector('#active-count'),
    completed: document.querySelector('#completed-count'),
    message: document.querySelector('#summary-message')
  };

  let assignments = loadAssignments();
  let currentFilter = 'all';

  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function loadAssignments() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(saved)) return [];
      return saved.filter(item => item && typeof item.id === 'string' && typeof item.course === 'string' &&
        typeof item.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) && typeof item.completed === 'boolean');
    } catch (error) {
      return [];
    }
  }

  function saveAssignments() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
      return true;
    } catch (error) {
      announce('저장 공간을 사용할 수 없어 변경 사항을 저장하지 못했어요.');
      return false;
    }
  }

  function announce(message) {
    statusMessage.textContent = '';
    window.setTimeout(() => { statusMessage.textContent = message; }, 20);
  }

  function formatDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
      .format(new Date(year, month - 1, day));
  }

  function daysUntil(value) {
    const [year, month, day] = value.split('-').map(Number);
    const due = Date.UTC(year, month - 1, day);
    const [todayYear, todayMonth, todayDay] = localDateString().split('-').map(Number);
    return Math.round((due - Date.UTC(todayYear, todayMonth - 1, todayDay)) / 86400000);
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function renderEmpty(message, hint) {
    const empty = makeElement('div', 'empty-state');
    empty.append(makeElement('div', 'empty-icon', '✓'), makeElement('p', '', message));
    if (hint) empty.append(makeElement('span', '', hint));
    list.replaceChildren(empty);
  }

  function renderCard(item) {
    const card = makeElement('article', `assignment-card${item.completed ? ' is-completed' : ''}`);
    const complete = makeElement('button', 'complete-button', item.completed ? '✓' : '');
    complete.type = 'button';
    complete.setAttribute('aria-label', item.completed ? `${item.title} 완료 취소` : `${item.title} 완료 표시`);
    complete.setAttribute('aria-pressed', String(item.completed));
    complete.addEventListener('click', () => {
      item.completed = !item.completed;
      saveAssignments();
      render();
      announce(item.completed ? `${item.title} 과제를 완료했어요.` : `${item.title} 과제를 진행 중으로 바꿨어요.`);
    });

    const info = makeElement('div', 'assignment-info');
    info.append(makeElement('p', 'assignment-title', item.title), makeElement('p', 'assignment-course', item.course));

    const meta = makeElement('div', 'assignment-meta');
    meta.append(makeElement('span', 'due-date', formatDate(item.dueDate)));
    if (!item.completed) {
      const remaining = daysUntil(item.dueDate);
      let label = '마감일';
      let style = 'due-label';
      if (remaining < 0) { label = `${Math.abs(remaining)}일 지남`; style += ' is-overdue'; }
      else if (remaining === 0) { label = '오늘 마감'; style += ' is-soon'; }
      else if (remaining === 1) { label = '내일 마감'; style += ' is-soon'; }
      else if (remaining <= 3) { label = `D-${remaining}`; style += ' is-soon'; }
      meta.append(makeElement('span', style, label));
    } else {
      meta.append(makeElement('span', 'due-label', '완료'));
    }

    const remove = makeElement('button', 'delete-button', '×');
    remove.type = 'button';
    remove.setAttribute('aria-label', `${item.title} 과제 삭제`);
    remove.title = '과제 삭제';
    remove.addEventListener('click', () => {
      assignments = assignments.filter(assignment => assignment.id !== item.id);
      saveAssignments();
      render();
      announce(`${item.title} 과제를 삭제했어요.`);
    });

    card.append(complete, info, meta, remove);
    return card;
  }

  function render() {
    const activeCount = assignments.filter(item => !item.completed).length;
    const completedCount = assignments.length - activeCount;
    counts.remaining.textContent = String(activeCount);
    counts.total.textContent = String(assignments.length);
    counts.all.textContent = String(assignments.length);
    counts.active.textContent = String(activeCount);
    counts.completed.textContent = String(completedCount);
    counts.message.textContent = activeCount === 0
      ? (assignments.length ? '모든 과제를 완료했어요. 멋져요!' : '새로운 과제를 등록해 보세요.')
      : '차근차근 하나씩 해봐요. 할 수 있어요!';

    const visible = assignments
      .filter(item => currentFilter === 'all' || (currentFilter === 'active' ? !item.completed : item.completed))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title, 'ko'));

    if (visible.length === 0) {
      if (assignments.length === 0) renderEmpty('등록된 과제가 없습니다', '왼쪽에서 첫 과제를 추가해 보세요.');
      else renderEmpty(currentFilter === 'active' ? '진행 중인 과제가 없습니다' : '완료한 과제가 없습니다', '다른 목록도 확인해 보세요.');
      return;
    }
    list.replaceChildren(...visible.map(renderCard));
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const course = String(data.get('course')).trim();
    const title = String(data.get('title')).trim();
    const dueDate = String(data.get('dueDate'));
    if (!course || !title || !dueDate) {
      announce('과목명, 과제명, 마감일을 모두 입력해 주세요.');
      return;
    }
    assignments.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, course, title, dueDate, completed: false });
    saveAssignments();
    currentFilter = 'all';
    document.querySelectorAll('.filter-button').forEach(button => {
      const selected = button.dataset.filter === currentFilter;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    form.reset();
    render();
    document.querySelector('#course-name').focus();
    announce(`${title} 과제를 등록했어요.`);
  });

  document.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.filter;
      document.querySelectorAll('.filter-button').forEach(filterButton => {
        const selected = filterButton === button;
        filterButton.classList.toggle('is-active', selected);
        filterButton.setAttribute('aria-pressed', String(selected));
      });
      render();
    });
  });

  todayElement.textContent = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  }).format(new Date());
  render();
})();
