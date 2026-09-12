// ===================================================
// Firebase 설정 및 초기화
// ===================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Firebase 프로젝트 설정
const firebaseConfig = {
  apiKey: "AIzaSyDiH6EY_kWXMHpDVyRqUAy61bWrhNOR1V8",
  authDomain: "test-b2f83.firebaseapp.com",
  projectId: "test-b2f83",
  storageBucket: "test-b2f83.firebasestorage.app",
  messagingSenderId: "953864875524",
  appId: "1:953864875524:web:2e3926ddd0b035a0d30f51"
};

// Firebase 및 Firestore 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 메모 목록 ---
// Firestore에서 실시간으로 가져온 메모들이 여기에 담깁니다.
let memos = [];


// ===================================================
// 데이터를 다루는 함수 세 개 (Firestore 연동)
// ===================================================

// 메모를 읽어 옵니다.
// Firestore의 memos 컬렉션을 실시간으로 감시(onSnapshot)하여
// 올린 순서(createdAt 오름차순)대로 가져와 화면을 그립니다.
function loadMemos() {
  const q = query(collection(db, "memos"), orderBy("createdAt", "asc"));
  onSnapshot(q, function (snapshot) {
    memos = [];
    snapshot.forEach(function (docSnap) {
      memos.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    render();
  });
}

// 메모를 새로 씁니다.
// Firestore memos 컬렉션에 새 문서를 추가합니다.
async function addMemo(text) {
  try {
    await addDoc(collection(db, "memos"), {
      text: text,
      createdAt: Date.now()
    });
  } catch (error) {
    console.error("메모 저장 중 오류가 발생했습니다:", error);
  }
}

// 메모를 지웁니다.
// Firestore에서 해당 id(문서 ID)의 문서를 삭제합니다.
async function deleteMemo(id) {
  try {
    await deleteDoc(doc(db, "memos", id));
  } catch (error) {
    console.error("메모 삭제 중 오류가 발생했습니다:", error);
  }
}


// ===================================================
// 화면 그리기
// ===================================================

function render() {
  const wall = document.getElementById("wall");
  wall.innerHTML = "";

  memos.forEach(function (memo) {
    wall.appendChild(makeMemo(memo));
  });
}

// 메모 한 장 만들기
function makeMemo(memo) {
  const div = document.createElement("div");
  div.className = "memo";

  const del = document.createElement("button");
  del.textContent = "×";
  del.addEventListener("click", function () {
    deleteMemo(memo.id);
  });
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  return div;
}


// ===================================================
// 메모 쓰는 칸
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

const input = document.getElementById("input");

input.addEventListener("keydown", async function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text === "") return;

    input.value = "";
    await addMemo(text);
  }
});


// 첫 화면: Firestore 실시간 연결 및 입력창 포커스
loadMemos();
input.focus();
