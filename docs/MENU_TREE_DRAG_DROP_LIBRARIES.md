# 메뉴 트리 드래그 앤 드롭 — 라이브러리/자료 정리

현재 메뉴 트리는 **@dnd-kit** 기반으로 직접 구현한 **flat 리스트 + depth/projection** 방식이라, “다른 항목 위에 놓기 = 그 항목 아래로”, “최상위 드롭 존” 등 세부 규칙을 직접 다듬어야 해서 난이도가 높습니다.  
아래는 **트리 전용 DnD**를 이미 처리해 둔 라이브러리와 참고 자료입니다.

---

## 1. dnd-kit-sortable-tree (현재 스택과 동일)

- **npm**: [dnd-kit-sortable-tree](https://www.npmjs.com/package/dnd-kit-sortable-tree) (주간 다운로드 ~21K)
- **GitHub**: [Shaddix/dnd-kit-sortable-tree](https://github.com/Shaddix/dnd-kit-sortable-tree)
- **데모**: [Storybook / Examples](https://shaddix.github.io/dnd-kit-sortable-tree)

**특징**
- **@dnd-kit/core + sortable** 위에 트리 전용 레이어를 올린 라이브러리.
- `SortableTree` 한 번에 `items`(중첩 구조) + `onItemsChanged` 로 순서/계층 변경을 받을 수 있음.
- 트리 아이템은 `SimpleTreeItemWrapper` 또는 `FolderTreeItemWrapper` + `forwardRef` 로 감싸서 사용.
- `canHaveChildren`, `disableSorting` 등으로 “이 노드에는 드롭 불가” 등 제어 가능.
- **indentationWidth**, **pointerSensorOptions**, **dndContextProps** 등으로 감도/들여쓰기 조정 가능.

**데이터 형식 예시**
```ts
const items = [
  { id: '1', value: 'Jane', children: [
    { id: '4', value: 'John' },
    { id: '5', value: 'Sally' },
  ]},
  { id: '2', value: 'Fred', children: [] },
  { id: '3', value: 'Helen', canHaveChildren: false },
];
```

**설치**
```bash
npm install dnd-kit-sortable-tree @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**호환성**  
- 프로젝트는 이미 `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 사용 중이므로 **추가만 하면 됨**.
- peer: `@dnd-kit/core >=6.0.5`, `@dnd-kit/sortable >=7.0.1` → 현재 버전과 맞음.

---

## 2. @minoru/react-dnd-treeview

- **npm**: [@minoru/react-dnd-treeview](https://www.npmjs.com/package/@minoru/react-dnd-treeview) (주간 다운로드 ~56K)
- **예제**: [CodeSandbox examples](https://codesandbox.io/examples/package/%40minoru/react-dnd-treeview)

**특징**
- **react-dnd** 기반. dnd-kit이 아니라 **react-dnd + MultiBackend** 필요.
- **flat 노드 배열** (`id`, `parent`, `droppable`, `text` 등)으로 트리 표현.
- `Tree` + `render` prop으로 노드 UI 완전 커스텀.
- 터치/포인터 지원(MultiBackend), 접근성/키보드 지원.

**데이터 형식**
```js
[
  { id: 1, parent: 0, droppable: true, text: "폴더1" },
  { id: 2, parent: 1, text: "파일1-1" },
  { id: 3, parent: 0, droppable: true, text: "폴더2" }
]
```

**단점**  
- dnd-kit과 다른 스택이라 **기존 메뉴 트리 DnD를 전부 교체**해야 함.

---

## 3. react-complex-tree

- **npm**: [react-complex-tree](https://www.npmjs.com/package/react-complex-tree)
- **문서**: [React Complex Tree](https://rct.lukasbach.com/docs/)
- **DnD 가이드**: [Drag and Drop Customizability](https://rct.lukasbach.com/docs/guides/drag-and-drop/)

**특징**
- 트리 전용 컴포넌트 + **DnD 규칙을 세밀하게 제어** 가능.
- `canDragAndDrop`, `canReorderItems`, `canDropOnFolder`, `canDropOnNonFolder` 등으로 “폴더에만 드롭” 등 제한.
- 다중 선택 드래그, **키보드 DnD**(Ctrl+D → 방향키 → Enter) 지원.
- 접근성(W3C), 키보드 네비게이션, 아이템 이름 변경 등 내장.

**단점**  
- dnd-kit과 별개 스택. 트리 데이터/API 구조가 현재 메뉴 트리와 다르면 **데이터 변환 레이어** 필요.

---

## 4. 기타 참고

| 라이브러리 | 특징 | 비고 |
|------------|------|------|
| **react-sortable-tree** | 계층형 DnD, 테마/헬퍼 내장 | 다운로드 많지만 유지보수 느림 |
| **he-tree-react** | HTML5 DnD API, flat/트리 둘 다, 가상 리스트 | 의존성 적음 |
| **@alpernative/tree** | 가상화, 중첩 DnD | 상대적으로 신규 |

---

## 5. dnd-kit 공식 쪽 참고

- **Nested sortable 이슈**: [dnd-kit#39](https://github.com/clauderic/dnd-kit/issues/39)
- **토론**: [dnd-kit discussions #1070](https://github.com/clauderic/dnd-kit/discussions/1070) — 트리/계층 관련 논의

---

## 추천 방향

1. **지금처럼 @dnd-kit 유지하면서 트리만 단순화**  
   → **dnd-kit-sortable-tree** 도입 검토.  
   - `items`(중첩) / `onItemsChanged` 만 넘기면 “순서·계층” 계산을 라이브러리가 처리.  
   - 현재 메뉴 API(parentId, sortOrder)와 맞추려면 `onItemsChanged`에서 한 번 flat 변환해서 서버 포맷으로 보내면 됨.

2. **완전히 다른 트리 컴포넌트로 갈아타기**  
   → **@minoru/react-dnd-treeview**(react-dnd) 또는 **react-complex-tree**.  
   - 메뉴 트리 UI/UX를 트리 전용 컴포넌트에 맞게 재구성해야 함.

3. **현재 구현 유지**  
   - 이미 “최상위 드롭 존”, “다른 항목 위 = 그 항목 아래”, “최상위로 이동” 버튼까지 반영된 상태.  
   - 세부 동작만 더 다듬고 싶다면, **dnd-kit-sortable-tree** 소스([SortingStrategy.ts 등](https://github.com/Shaddix/dnd-kit-sortable-tree))를 참고해 projection/insertIndex 로직을 비교해 보는 것도 도움이 됨.

이 문서는 `docs/MENU_TREE_DRAG_DROP_LIBRARIES.md` 에 두었습니다. 라이브러리 선택이나 마이그레이션 단계가 정해지면 그에 맞춰 구체적인 적용 예시(데이터 변환, API 연동)도 이어서 정리할 수 있습니다.
