; Disassembly of function: entry
; Entry Point: 1000:0010

1000:0010: CALLF 0x1310:0000     ; Far call to ThunRTMain (Ordinal_100)
1000:0015: ADD word ptr [BX + SI], AX   ; Dead code - ThunRTMain never returns
1000:0017: ADC byte ptr [BX + SI], DL   ; Dead code

; Total instructions: 3
; Notes: This is the entire native x86 code in the binary.
; ThunRTMain receives a pointer (via register or preceding data) to the VB3
; project structure at segment 1120:0000, which contains form list, VBX list,
; and project metadata. The VB3 runtime takes over from here.
