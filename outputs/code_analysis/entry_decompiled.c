/* WARNING: Control flow encountered bad instruction data */

void entry(void)
{
  uint *puVar1;
  uint uVar2;
  uint uVar3;
  char extraout_DL;
  int in_BX;
  int unaff_SI;

  uVar3 = Ordinal_100();
  puVar1 = (uint *)(in_BX + unaff_SI);
  uVar2 = *puVar1;
  *puVar1 = *puVar1 + uVar3;
  *(char *)(in_BX + unaff_SI) = *(char *)(in_BX + unaff_SI) + extraout_DL + CARRY2(uVar2,uVar3);
                    /* WARNING: Bad instruction - Truncating control flow here */
  halt_baddata();
}
