type Listener = () => void;

let _currentPage = 0;
let _totalPages = 0;
let _snapShot = { currentPage: _currentPage, totalPages: _totalPages };
const _listeners = new Set<Listener>();

function notify() {
  _listeners.forEach((listener) => listener());
}

export const paginationStore = {
  subscribe(listener: Listener) {
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  },

  getSnapshot() {
    return _snapShot;
  },

  set(currentPage: number, totalPages: number) {
    if (_currentPage === currentPage && _totalPages === totalPages) return;
    _currentPage = currentPage;
    _totalPages = totalPages;
    _snapShot = { currentPage, totalPages };
    notify();
  },
};
