// ===================================================
// Firebase 설정 및 초기화
// ===================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// Firebase 프로젝트 설정
const firebaseConfig = {
  apiKey: "AIzaSyDiH6EY_kWXMHpDVyRqUAy61bWrhNOR1V8",
  authDomain: "test-b2f83.firebaseapp.com",
  projectId: "test-b2f83",
  storageBucket: "test-b2f83.firebasestorage.app",
  messagingSenderId: "953864875524",
  appId: "1:953864875524:web:2e3926ddd0b035a0d30f51"
};

// Firebase 및 Firestore, Auth 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 현재 로그인한 사용자 정보 (로그아웃 시 null)
let currentUser = null;
// 현재 사용자의 역할 ('teacher' 또는 'student')
let currentUserRole = "student";

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
  if (!currentUser) {
    alert("로그인 후 메모를 작성할 수 있습니다.");
    return;
  }

  try {
    const memoData = {
      text: text,
      createdAt: Date.now(),
      uid: currentUser.uid,
      author: currentUser.displayName || (currentUserRole === "teacher" ? "선생님" : "학생")
    };
    await addDoc(collection(db, "memos"), memoData);
  } catch (error) {
    console.error("메모 저장 중 오류가 발생했습니다:", error);
    alert("메모 저장에 실패했습니다. (5글자 이상 입력했는지 확인해 주세요)");
  }
}

// 메모를 지웁니다.
// Firestore에서 해당 id(문서 ID)의 문서를 삭제합니다.
async function deleteMemo(id) {
  try {
    await deleteDoc(doc(db, "memos", id));
  } catch (error) {
    console.error("메모 삭제 중 오류가 발생했습니다:", error);
    alert("메모를 삭제할 권한이 없습니다. (교사만 삭제할 수 있습니다)");
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

  // 삭제 버튼: 교사(teacher)만 삭제 가능
  const del = document.createElement("button");
  del.className = "del-btn";
  del.textContent = "×";
  del.title = currentUserRole === "teacher" ? "메모 삭제" : "교사만 삭제할 수 있습니다";
  del.addEventListener("click", function () {
    if (currentUserRole !== "teacher") {
      alert("삭제 권한이 없습니다. 교사(teacher)만 메모를 삭제할 수 있습니다.");
      return;
    }
    deleteMemo(memo.id);
  });
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  // 작성자 정보가 있는 경우 표시합니다.
  if (memo.author) {
    const authorDiv = document.createElement("div");
    authorDiv.style.fontSize = "12px";
    authorDiv.style.color = "#888";
    authorDiv.style.marginTop = "8px";
    authorDiv.textContent = `작성자: ${memo.author}`;
    div.appendChild(authorDiv);
  }

  // AI 코멘트가 있는 경우 표시합니다.
  if (memo.aiComment) {
    const aiBox = document.createElement("div");
    aiBox.className = "ai-comment";
    aiBox.style.marginTop = "8px";
    aiBox.style.padding = "6px 8px";
    aiBox.style.background = "#eef7ff";
    aiBox.style.borderLeft = "3px solid #1a73e8";
    aiBox.style.borderRadius = "4px";
    aiBox.style.fontSize = "12px";
    aiBox.style.color = "#174ea6";
    aiBox.style.lineHeight = "1.4";
    aiBox.innerHTML = `<strong>🤖 AI 코멘트:</strong><br>${memo.aiComment}`;
    div.appendChild(aiBox);
  }

  // 교사(teacher)에게만 AI 코멘트 생성 버튼 노출
  if (currentUserRole === "teacher") {
    const aiBtn = document.createElement("button");
    aiBtn.textContent = memo.aiComment ? "🤖 AI 코멘트 다시받기" : "🤖 AI 코멘트 받기";
    aiBtn.style.marginTop = "8px";
    aiBtn.style.padding = "3px 6px";
    aiBtn.style.fontSize = "12px";
    aiBtn.style.cursor = "pointer";
    aiBtn.style.borderRadius = "3px";
    aiBtn.style.border = "1px solid #1a73e8";
    aiBtn.style.background = "#fff";
    aiBtn.style.color = "#1a73e8";

    aiBtn.addEventListener("click", async function () {
      aiBtn.disabled = true;
      aiBtn.textContent = "생성 중...";
      await requestAiComment(memo.id, memo.text);
      aiBtn.disabled = false;
      aiBtn.textContent = "🤖 AI 코멘트 다시받기";
    });
    div.appendChild(aiBtn);
  }

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


// ===================================================
// 구글 로그인 및 사용자 역할(교사/학생) 관리
// ===================================================

const userArea = document.getElementById("userArea");

// 로그인 상태 변경 감시 (로그인 / 로그아웃 시 자동 실행)
onAuthStateChanged(auth, async function (user) {
  currentUser = user;
  if (currentUser) {
    // Firestore users 컬렉션에서 사용자 역할(교사/학생) 조회
    await loadUserRole(currentUser.uid);
  } else {
    currentUserRole = "student";
  }
  renderUserArea();
  render(); // 역할 변경에 따른 화면 갱신
});

// 사용자 역할(teacher/student) 불러오기
async function loadUserRole(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      currentUserRole = snap.data().role || "student";
    } else {
      // 신규 사용자는 기본값 student로 등록 (UI에서 변경 가능)
      currentUserRole = "student";
      await setDoc(userRef, { role: "student" });
    }
  } catch (error) {
    console.error("역할 정보 조회 실패:", error);
    currentUserRole = "student";
  }
}

// 사용자 역할 변경 (UI에서 교사/학생 전환 시)
async function changeUserRole(newRole) {
  if (!currentUser) return;
  currentUserRole = newRole;
  try {
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, { role: newRole }, { merge: true });
  } catch (error) {
    console.error("역할 변경 저장 실패:", error);
  }
  renderUserArea();
  render();
}

// 로그인 영역(userArea) 화면 그리기
function renderUserArea() {
  if (!userArea) return;

  if (currentUser) {
    // 로그인된 상태: 사용자 이름, 역할 선택, 일괄 AI 버튼(교사용), 로그아웃 버튼 표시
    userArea.innerHTML = `
      <span>👋 <strong>${currentUser.displayName || "사용자"}</strong>님</span>
      <span style="margin-left: 8px;">
        역할:
        <select id="roleSelect" style="padding: 3px 6px; font-size: 13px;">
          <option value="student" ${currentUserRole === "student" ? "selected" : ""}>학생 (student)</option>
          <option value="teacher" ${currentUserRole === "teacher" ? "selected" : ""}>교사 (teacher)</option>
        </select>
      </span>
      ${
        currentUserRole === "teacher"
          ? `<button id="batchAiBtn" style="margin-left: 8px; padding: 3px 8px; cursor: pointer; background: #e8f0fe; color: #1a73e8; border: 1px solid #1a73e8; border-radius: 4px; font-size: 13px;">🤖 전체 AI 코멘트 달기</button>`
          : ""
      }
      <button id="logoutBtn" style="margin-left: 8px; cursor: pointer;">로그아웃</button>
    `;

    document.getElementById("roleSelect").addEventListener("change", function (e) {
      changeUserRole(e.target.value);
    });
    if (currentUserRole === "teacher") {
      document.getElementById("batchAiBtn").addEventListener("click", requestAiCommentsForAll);
    }
    document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  } else {
    // 로그아웃된 상태: 구글 로그인 버튼 표시
    userArea.innerHTML = `
      <button id="loginBtn" style="cursor: pointer;">Google 계정으로 로그인</button>
    `;
    document.getElementById("loginBtn").addEventListener("click", handleLogin);
  }
}

// 구글 팝업 로그인 처리
async function handleLogin() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("로그인 중 오류가 발생했습니다:", error);
    if (error.code === "auth/unauthorized-domain") {
      alert("현재 도메인이 Firebase 콘솔의 승인된 도메인(Authorized Domains)에 등록되지 않았습니다.");
    } else if (error.code !== "auth/popup-closed-by-user") {
      alert("로그인에 실패했습니다: " + error.message);
    }
  }
}

// 로그아웃 처리
async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("로그아웃 중 오류가 발생했습니다:", error);
  }
}


// ===================================================
// AI 코멘트 (Gemini API 연동)
// ===================================================

// 특정 메모에 대한 AI 코멘트 요청 및 Firestore 저장
async function requestAiComment(memoId, text) {
  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: text })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `서버 오류 (HTTP ${response.status})`);
    }

    const result = await response.json();
    if (result.comment) {
      await updateDoc(doc(db, "memos", memoId), {
        aiComment: result.comment,
        aiCommentedAt: Date.now()
      });
    }
  } catch (error) {
    console.error("AI 코멘트 요청 실패:", error);
    alert("AI 코멘트를 가져오지 못했습니다: " + error.message);
  }
}

// 담벼락의 모든 메모에 대해 AI 코멘트 일괄 요청
async function requestAiCommentsForAll() {
  const targetMemos = memos.filter(function (m) {
    return !m.aiComment;
  });

  if (targetMemos.length === 0) {
    alert("담벼락의 모든 메모에 이미 AI 코멘트가 작성되어 있습니다.");
    return;
  }

  const batchBtn = document.getElementById("batchAiBtn");
  if (batchBtn) {
    batchBtn.disabled = true;
    batchBtn.textContent = `생성 중... (0/${targetMemos.length})`;
  }

  for (let i = 0; i < targetMemos.length; i++) {
    const memo = targetMemos[i];
    await requestAiComment(memo.id, memo.text);
    if (batchBtn) {
      batchBtn.textContent = `생성 중... (${i + 1}/${targetMemos.length})`;
    }
  }

  if (batchBtn) {
    batchBtn.disabled = false;
    batchBtn.textContent = "🤖 전체 AI 코멘트 달기";
  }
  alert("모든 메모에 AI 코멘트 작성이 완료되었습니다!");
}

