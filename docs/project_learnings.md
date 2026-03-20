# Board for developers

# Giải thích bản chất kỹ thuật

- Tại sao dùng window cho sự kiện mousemove và mouseup?Nếu bạn chỉ gán vào viewport, khi bạn kéo chuột quá nhanh ra ngoài khung hình, sự kiện sẽ bị ngắt quãng. Gán vào window giúp việc kéo mượt mà dù chuột có đi đâu.
- Tại sao dùng translate3d?Thay đổi top/left sẽ bắt trình duyệt tính toán lại Layout (Reflow). Dùng transform chỉ tác động lên lớp Composite (GPU đảm nhận), giúp chuyển động mượt 60fps kể cả khi bảng có nhiều nội dung.
- Hệ tọa độ:Lưu ý rằng khi bạn kéo chuột sang phải ($\Delta x$ dương), cái bảng cũng dịch sang phải (tọa độ $X$ tăng dần).

---

# Kỹ thuật: Zoom relative to Point

## Để làm được điều này, chúng ta cần cập nhật đồng thời cả scale và translate (vị trí) của bảng.

- Biến số mới: Thêm một biến scale (mặc định là 1).
- Sự kiện wheel: Lắng nghe khi người dùng lăn chuột.
- Toán học: \* Xác định vị trí chuột so với tấm bảng trước khi zoom.
  - Thay đổi giá trị scale.
  - Điều chỉnh lại currentX và currentY để điểm dưới chuột không bị lệch đi.

---

# Tạo ghi chú (Coordinate Translation)

- Khi bạn Double Click vào một điểm trên màn hình, tọa độ chuột bạn nhận được là Screen Coordinates (ví dụ: $500, 300$). Nhưng nếu cái bảng đang bị kéo đi hoặc đang zoom, bạn không thể đặt ghi chú vào đúng tọa độ đó được. Bạn phải chuyển nó về World Coordinates.
- Công thức chuyển đổi:

  $$
  WorldX = \frac{MouseX - currentX}{scale}
  $$

  $$
  WorldY = \frac{MouseY - currentY}{scale}
  $$

## Giải thích bản chất kỹ thuật

- Tại sao phải chặn stopPropagation()? Sự kiện trong JS có tính chất "nổi bọt" (Event Bubbling). Nếu bạn click vào ghi chú mà không chặn lại, sự kiện đó sẽ trôi lên #viewport và làm cho cả cái bảng bị kéo đi.

- contentEditable: Đây là cách nhanh nhất trong Vanilla JS để biến một thẻ div bình thường thành một ô nhập liệu mà không cần dùng đến thẻ `<textarea>`. Nó giúp giao diện trông "nhẹ nhàng" và tự nhiên hơn trên Workspace.

---

# Di chuyển đối tượng (Draggable Objects)

- Thử thách ở đây là: Khi bạn kéo một ghi chú, bạn phải tính toán độ dời của chuột nhưng phải chia cho tỷ lệ scale hiện tại. Nếu không, khi bạn đang zoom 200%, bạn kéo chuột 10px thì cái ghi chú sẽ nhảy đi tận 20px, tạo cảm giác bị "trượt".

## Công thức tính tọa độ trong không gian Zoom:

Nếu chuột di chuyển một khoảng $\Delta Mouse$, thì khoảng cách đối tượng cần di chuyển trong thế giới (World) là:$$\Delta World = \frac{\Delta Mouse}{scale}$$

## Quán tính (Inertia)

Để làm được điều này, chúng ta cần vận dụng kiến thức vật lý cơ bản: Vận tốc (Velocity) và Lực ma sát (Friction).

- Nguyên lý Vật lý
  - Vận tốc: Trong lúc người dùng đang kéo chuột, chúng ta tính xem chuột di chuyển bao nhiêu pixel mỗi khung hình.
  - Duy trì: Khi buông chuột (mouseup), chúng ta không dừng việc cập nhật tọa độ mà tiếp tục cộng vận tốc đó vào vị trí của bảng.
  - Ma sát: Sau mỗi khung hình, chúng ta giảm dần vận tốc này (nhân với một hệ số < 1, ví dụ 0.95) cho đến khi vận tốc xấp xỉ bằng 0 thì dừng hẳn.

## Lerp (Linear Interpolation - Nội suy tuyến tính)

Lerp là một công cụ toán học dùng để tìm một giá trị nằm giữa hai điểm dựa trên một tỷ lệ. Trong UI, nó được dùng để làm mượt chuyển động từ điểm hiện tại đến một điểm đích đã biết trước.

- Công thức:$$P_{current} = P_{current} + (P_{target} - P_{current}) \times \text{ease}$$
  - Ease: Tỉ lệ mượt (thường từ 0.05 đến 0.15). Số càng nhỏ, chuyển động càng lướt và chậm.
  - Điều kiện dừng: Vì về mặt toán học, Current sẽ không bao giờ chạm hẳn vào Target (nó cứ nhỏ dần mãi), nên ta cần một ngưỡng (threshold) để ép nó dừng lại và tắt "động cơ" rAF.
  - Đặc điểm: Bạn luôn biết rõ điểm dừng ($P_{target}$).
  - Cảm giác: Vật thể di chuyển nhanh lúc đầu và chậm dần khi tiến gần sát đích (nhưng không bao giờ thực sự chạm hẳn vào đích về mặt toán học nếu không có điều kiện dừng).
  - Ứng dụng: Làm mượt con trỏ chuột, làm mượt việc Zoom, hoặc khi bạn muốn cái bảng "đuổi theo" vị trí chuột một cách từ tốn

### Kỹ thuật "Anchor Point Pinned" (Ghim điểm neo)

- Vấn đề:
  - Khi lăn chuột, bạn tính ngay lập tức điểm đến cuối cùng: targetScale, targetX và targetY.
  - Trong hàm animate, bạn bắt cả 3 biến này "đuổi theo" mục tiêu một cách độc lập.
  - Phép toán Zoom yêu cầu $X, Y$ và $Scale$ phải khớp nhau hoàn hảo tại mọi khung hình để giữ điểm dưới chuột đứng yên. Nhưng vì Lerp là nội suy, trong quá trình di chuyển, có thể currentScale đã đi được 50% quãng đường nhưng currentX mới đi được 40% (do sai số hoặc do tính toán độc lập).
  - Khoảng hở 10% đó chính là lúc bạn thấy màn hình "giật" sang một hướng rồi mới đuổi kịp về vị trí đúng.

- Cách khắc phục:
  Thay vì Lerp cả 3 biến độc lập, chúng ta chỉ nên Lerp biến Scale. Sau đó, ở mỗi khung hình, chúng ta tính toán lại X và Y dựa trên biến Scale hiện tại để đảm bảo điểm neo (vị trí chuột) luôn được "ghim" chặt.

---

# Dán hình ảnh (Clipboard API)

- Kỹ thuật sử dụng:
  - event.clipboardData: Truy cập dữ liệu bộ nhớ tạm.
  - URL.createObjectURL(file): Tạo một đường dẫn tạm thời từ dữ liệu nhị phân (Blob) của ảnh để gán vào thẻ <img>.
- Giải thích bản chất kỹ thuật
  - Hệ tọa độ tương đối: Khi bạn dán ảnh, chúng ta dùng window.innerWidth / 2 để lấy tâm màn hình. Sau đó dùng công thức "ngược" để tìm ra điểm đó tương ứng với tọa độ nào trong World đang bị zoom/pan.
  - Quản lý bộ nhớ: URL.createObjectURL tạo ra một URL chiếm RAM. Với một ứng dụng lớn, bạn nên dùng URL.revokeObjectURL(source) khi xóa ảnh để giải phóng bộ nhớ.
  - Z-Index: Việc đổi zIndex khi đang kéo giúp đối tượng bạn đang cầm luôn nằm trên các đối tượng khác, tránh việc bị che khuất gây khó chịu.

---

# Tối ưu

- Tối ưu Rendering: GPU thay vì CPU
  - Trình duyệt có 3 công đoạn chính để hiển thị: Layout -> Paint -> Composite.

  - Vấn đề: Thay đổi top/left buộc trình duyệt chạy lại cả 3 bước (rất chậm).

  - Giải pháp: Sử dụng thuộc tính transform (translate3d/scale).

  - Bản chất: transform chỉ tác động vào bước Composite. Trình duyệt sẽ tách cái bảng (#world) thành một "Layer" riêng và đẩy cho GPU xử lý. GPU cực kỳ giỏi trong việc di chuyển và phóng to các mảng ảnh mà không cần tính toán lại cấu trúc HTML.

  - Kỹ thuật bổ trợ: Sử dụng CSS will-change: transform;. Nó báo trước cho trình duyệt: "Này, cái lớp này sắp di chuyển đấy, hãy cấp riêng cho nó một slot trong bộ nhớ GPU đi".

- Tối ưu Tần suất: Chiến thuật requestAnimationFrame (rAF)
  - Vấn đề: Sự kiện mousemove có thể bắn ra 100-200 lần/giây, trong khi màn hình của bạn thường chỉ hiển thị được 60 khung hình/giây (60fps). Việc tính toán thừa thãi 140 lần kia là lãng phí tài nguyên CPU.

  - Giải pháp: Đừng cập nhật UI ngay trong hàm mousemove.

  - Hãy lưu tọa độ chuột vào một biến.

  - Sử dụng một "vòng lặp render" (Render Loop) bằng requestAnimationFrame. Vòng lặp này sẽ hỏi trình duyệt: "Bạn đã sẵn sàng vẽ khung hình tiếp theo chưa?". Nếu sẵn sàng, nó mới lấy tọa độ chuột mới nhất để vẽ.

- Tối ưu Số lượng: Viewport Culling (Loại bỏ đối tượng ngoài khung hình)
  - Đây là kỹ thuật "thượng thừa" của các game engine như Unity hay Unreal.

  - Vấn đề: Dù bạn không nhìn thấy ghi chú ở tọa độ (5000, 5000), trình duyệt vẫn phải giữ nó trong bộ nhớ và đôi khi vẫn cố gắng tính toán đổ bóng/viền cho nó.

  - Giải pháp:
    1. Xác định vùng hình chữ nhật của Viewport (Vùng đang nhìn thấy).
    2. Duyệt qua danh sách ghi chú, tính toán xem ghi chú nào nằm ngoài vùng này.
    3. Thêm class .hidden (với display: none hoặc visibility: hidden) cho những đối tượng đó. Trình duyệt sẽ hoàn toàn bỏ qua việc vẽ các đối tượng này, giúp giảm tải cực lớn.
  - Kỹ thuật chi tiết:
    1. Bản chất toán học: "Cái hộp trong cái hộp":
       Để biết một ghi chú có nên hiện ra hay không, chúng ta cần so sánh hai hình chữ nhật:
       1. Viewport Rect: Vùng cửa sổ hiển thị (đã được quy đổi về hệ tọa độ World).
       2. Object Rect: Vùng bao quanh ghi chú hoặc hình ảnh.

    2. Công thức xác định vùng hiển thị (World Space)
       Khi bạn zoom và pan, "vùng nhìn thấy" trong không gian World sẽ thay đổi. Tọa độ của vùng này được tính như sau:
       - $Left_{view} = \frac{-currentX}{currentScale}$

       - $Top_{view} = \frac{-currentY}{currentScale}$

       - $Width_{view} = \frac{ViewportWidth}{currentScale}$

       - $Height_{view} = \frac{ViewportHeight}{currentScale}$

    3. Thuật toán kiểm tra va chạm (AABB Collision)
       Một đối tượng được coi là "đang nhìn thấy" nếu nó thỏa mãn:

       $$Obj_{right} > View_{left} \quad \& \quad Obj_{left} < View_{right} \quad \& \quad Obj_{bottom} > View_{top} \quad \& \quad Obj_{top} < View_{bottom}$$

- Tối ưu Bộ nhớ: Quản lý Assets (Hình ảnh)
  - Vấn đề: Bạn dán 10 tấm ảnh 4K vào bảng. Mỗi tấm chiếm vài chục MB RAM. Web sẽ crash sớm.

  - Giải pháp:
    - Thumbnail: Nếu ảnh quá to, hãy vẽ nó lên một thẻ `<canvas>` nhỏ hơn và hiển thị bản thumbnail đó thay vì ảnh gốc.

    - Clean-up: Khi xóa một ghi chú ảnh, hãy gọi URL.revokeObjectURL(source) để giải phóng bộ nhớ mà trình duyệt đã cấp cho Blob đó.

---

# TODO

Quy mô dự án,Kỹ thuật khuyến nghị
Nhỏ (< 100 object),Vanilla DOM + CSS Transitions.
Trung bình (100 - 500),DOM + rAF + Dirty Flag (Cách chúng ta đang làm).
Lớn (500 - 5.000),DOM + Spatial Partitioning (Quadtree) + Viewport Culling.
Cực lớn (> 5.000),HTML5 Canvas / WebGL + Web Workers (để xử lý tính toán nặng ở luồng riêng).
