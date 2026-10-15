//
// Copyright (c) 2003, 2025, Oracle and/or its affiliates. All rights reserved.
// DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
//
// This code is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License version 2 only, as
// published by the Free Software Foundation.
//
// This code is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
// version 2 for more details (a copy is included in the LICENSE file that
// accompanied this code).
//
// You should have received a copy of the GNU General Public License version
// 2 along with this work; if not, write to the Free Software Foundation,
// Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
//
// Please contact Oracle, 500 Oracle Parkway, Redwood Shores, CA 94065 USA
// or visit www.oracle.com if you need additional information or have any
// questions.
//
//

// Machine Generated File.  Do Not Edit!

#include "adfiles/ad_x86.hpp"
int addI_rRegNode::peephole(Block* block, int block_index, PhaseCFG* cfg_, PhaseRegAlloc* ra_) {
  bool  matches = true;
  MachNode *inst0 = this;
  if( ((OptoPeepholeAt == -1) || (OptoPeepholeAt==0)) && ( 
#line 14510 "/mnt/d/learn/concurrencykimi/javabox-research/openjdk/src/hotspot/cpu/x86/x86_64.ad"
VM_Version::supports_fast_2op_lea()
#line 999999
 ) ) {
    auto replacing = [](){ return static_cast<MachNode*>(new leaI_rReg_rReg_peepNode()); };
    bool replacement = Peephole::lea_coalesce_reg(block, block_index, cfg_, ra_, replacing, addI_rReg_rule);
    if (replacement) {
      return 0;
    }
  } // end of peephole rule #0

  return -1;  // No peephole rules matched
}

int addI_rReg_immNode::peephole(Block* block, int block_index, PhaseCFG* cfg_, PhaseRegAlloc* ra_) {
  bool  matches = true;
  MachNode *inst0 = this;
  if( ((OptoPeepholeAt == -1) || (OptoPeepholeAt==1)) && ( 
#line 14518 "/mnt/d/learn/concurrencykimi/javabox-research/openjdk/src/hotspot/cpu/x86/x86_64.ad"
VM_Version::supports_fast_2op_lea()
#line 999999
 ) ) {
    auto replacing = [](){ return static_cast<MachNode*>(new leaI_rReg_immI_peepNode()); };
    bool replacement = Peephole::lea_coalesce_imm(block, block_index, cfg_, ra_, replacing, addI_rReg_imm_rule);
    if (replacement) {
      return 1;
    }
  } // end of peephole rule #1

  return -1;  // No peephole rules matched
}

int incI_rRegNode::peephole(Block* block, int block_index, PhaseCFG* cfg_, PhaseRegAlloc* ra_) {
  bool  matches = true;
  MachNode *inst0 = this;
  if( ((OptoPeepholeAt == -1) || (OptoPeepholeAt==2)) && ( 
#line 14526 "/mnt/d/learn/concurrencykimi/javabox-research/openjdk/src/hotspot/cpu/x86/x86_64.ad"
VM_Version::supports_fast_3op_lea() ||
                VM_Version::is_intel_cascade_lake()
#line 999999
 ) ) {
    auto replacing = [](){ return static_cast<MachNode*>(new leaI_rReg_immI_peepNode()); };
    bool replacement = Peephole::lea_coalesce_imm(block, block_index, cfg_, ra_, replacing, incI_rReg_rule);
    if (replacement) {
      return 2;
    }
  } // end of peephole rule #2

  return -1;  // No peephole rules matched
}

int decI_rRegNode::peephole(Block* block, int block_index, PhaseCFG* cfg_, PhaseRegAlloc* ra_) {
  bool  matches = true;
  MachNode *inst0 = this;
  if( ((OptoPeepholeAt == -1) || (OptoPeepholeAt==3)) && ( 
#line 14535 "/mnt/d/learn/concurrencykimi/javabox-research/openjdk/src/hotspot/cpu/x86/x86_64.ad"
VM_Version::supports_fast_3op_lea() ||
                VM_Version::is_intel_cascade_lake()
#line 999999
 ) ) {
    auto replacing = [](){ return static_cast<MachNode*>(new leaI_rReg_immI_peepNode()); };
    bool replacement = Peephole::lea_coalesce_imm(block, block_index, cfg_, ra_, replacing, decI_rReg_rule);
    if (replacement) {
      return 3;
    }
  } // end of peephole rule #3

  return -1;  // No peephole rules matched
}

int addL_rRegNode::peephole(Block* block, int block_index, PhaseCFG* cfg_, PhaseRegAlloc* ra_) {
  bool  matches = true;
  MachNode *inst0 = this;
  if( ((OptoPeepholeAt == -1) || (OptoPeepholeAt==5)) && ( 
#line 14552 "/mnt/d/learn/concurrencykimi/javabox-research/openjdk/src/hotspot/cpu/x86/x86_64.ad"
VM_Version::supports_fast_2op_lea()
#line 999999
 ) ) {
    auto replacing = [](){ return static_cast<MachNode*>(new leaL_rReg_rReg_peepNode()); };
    bool replacement = Peephole::lea_coalesce_reg(block, block_index, cfg_, ra_, replacing, addL_rReg_rule);
    if (replacement) {
      return 5;
    }
  } // end of peephole rule #5

  return -1;  // No peephole rules matched
}

int addL_rReg_immNode::peephole(Block* block, int block_index, PhaseCFG* cfg_, PhaseRegAlloc* ra_) {
  bool  matches = true;
  MachNode *inst0 = this;
  if( ((OptoPeepholeAt == -1) || (OptoPeepholeAt==6)) && ( 
#line 14560 "/mnt/d/learn/concurrencykimi/javabox-research/openjdk/src/hotspot/cpu/x86/x86_64.ad"
VM_Version::supports_fast_2op_lea()
#line 999999
 ) ) {
    auto replacing = [](){ return static_cast<MachNode*>(new leaL_rReg_immL32_peepNode()); };
    bool replacement = Peephole::lea_coalesce_imm(block, block_index, cfg_, ra_, replacing, addL_rReg_imm_rule);
    if (replacement) {
      return 6;
    }
  } // end of peephole rule #6

  return -1;  // No peephole rules matched
}

int incL_rRegNode::peephole(Block* block, int block_index, PhaseCFG* cfg_, PhaseRegAlloc* ra_) {
  bool  matches = true;
  MachNode *inst0 = this;
  if( ((OptoPeepholeAt == -1) || (OptoPeepholeAt==7)) && ( 
#line 14568 "/mnt/d/learn/concurrencykimi/javabox-research/openjdk/src/hotspot/cpu/x86/x86_64.ad"
VM_Version::supports_fast_3op_lea() ||
                VM_Version::is_intel_cascade_lake()
#line 999999
 ) ) {
    auto replacing = [](){ return static_cast<MachNode*>(new leaL_rReg_immL32_peepNode()); };
    bool replacement = Peephole::lea_coalesce_imm(block, block_index, cfg_, ra_, replacing, incL_rReg_rule);
    if (replacement) {
      return 7;
    }
  } // end of peephole rule #7

  return -1;  // No peephole rules matched
}

int decL_rRegNode::peephole(Block* block, int block_index, PhaseCFG* cfg_, PhaseRegAlloc* ra_) {
  bool  matches = true;
  MachNode *inst0 = this;
  if( ((OptoPeepholeAt == -1) || (OptoPeepholeAt==8)) && ( 
#line 14577 "/mnt/d/learn/concurrencykimi/javabox-research/openjdk/src/hotspot/cpu/x86/x86_64.ad"
VM_Version::supports_fast_3op_lea() ||
                VM_Version::is_intel_cascade_lake()
#line 999999
 ) ) {
    auto replacing = [](){ return static_cast<MachNode*>(new leaL_rReg_immL32_peepNode()); };
    bool replacement = Peephole::lea_coalesce_imm(block, block_index, cfg_, ra_, replacing, decL_rReg_rule);
    if (replacement) {
      return 8;
    }
  } // end of peephole rule #8

  return -1;  // No peephole rules matched
}

int salI_rReg_immI2Node::peephole(Block* block, int block_index, PhaseCFG* cfg_, PhaseRegAlloc* ra_) {
  bool  matches = true;
  MachNode *inst0 = this;
  if( ((OptoPeepholeAt == -1) || (OptoPeepholeAt==4)) && ( 
#line 14544 "/mnt/d/learn/concurrencykimi/javabox-research/openjdk/src/hotspot/cpu/x86/x86_64.ad"
VM_Version::supports_fast_2op_lea()
#line 999999
 ) ) {
    auto replacing = [](){ return static_cast<MachNode*>(new leaI_rReg_immI2_peepNode()); };
    bool replacement = Peephole::lea_coalesce_imm(block, block_index, cfg_, ra_, replacing, salI_rReg_immI2_rule);
    if (replacement) {
      return 4;
    }
  } // end of peephole rule #4

  return -1;  // No peephole rules matched
}

int salL_rReg_immI2Node::peephole(Block* block, int block_index, PhaseCFG* cfg_, PhaseRegAlloc* ra_) {
  bool  matches = true;
  MachNode *inst0 = this;
  if( ((OptoPeepholeAt == -1) || (OptoPeepholeAt==9)) && ( 
#line 14586 "/mnt/d/learn/concurrencykimi/javabox-research/openjdk/src/hotspot/cpu/x86/x86_64.ad"
VM_Version::supports_fast_2op_lea()
#line 999999
 ) ) {
    auto replacing = [](){ return static_cast<MachNode*>(new leaL_rReg_immI2_peepNode()); };
    bool replacement = Peephole::lea_coalesce_imm(block, block_index, cfg_, ra_, replacing, salL_rReg_immI2_rule);
    if (replacement) {
      return 9;
    }
  } // end of peephole rule #9

  return -1;  // No peephole rules matched
}

int testI_regNode::peephole(Block* block, int block_index, PhaseCFG* cfg_, PhaseRegAlloc* ra_) {
  bool  matches = true;
  MachNode *inst0 = this;
  if( ((OptoPeepholeAt == -1) || (OptoPeepholeAt==10)) && ( true ) ) {
    auto replacing = nullptr;
    bool replacement = Peephole::test_may_remove(block, block_index, cfg_, ra_, replacing, testI_reg_rule);
    if (replacement) {
      return 10;
    }
  } // end of peephole rule #10

  return -1;  // No peephole rules matched
}

int testL_regNode::peephole(Block* block, int block_index, PhaseCFG* cfg_, PhaseRegAlloc* ra_) {
  bool  matches = true;
  MachNode *inst0 = this;
  if( ((OptoPeepholeAt == -1) || (OptoPeepholeAt==11)) && ( true ) ) {
    auto replacing = nullptr;
    bool replacement = Peephole::test_may_remove(block, block_index, cfg_, ra_, replacing, testL_reg_rule);
    if (replacement) {
      return 11;
    }
  } // end of peephole rule #11

  return -1;  // No peephole rules matched
}

// Check consistency of C++ compilation with ADLC options:
// Check adlc -DAMD64=1
#ifndef AMD64
#  error "AMD64 must be defined"
#endif // AMD64
// Check adlc -D_LP64=1
#ifndef _LP64
#  error "_LP64 must be defined"
#endif // _LP64
// Check adlc -DNDEBUG=1
#ifndef NDEBUG
#  error "NDEBUG must be defined"
#endif // NDEBUG
// Check adlc -DPRODUCT=1
#ifndef PRODUCT
#  error "PRODUCT must be defined"
#endif // PRODUCT
