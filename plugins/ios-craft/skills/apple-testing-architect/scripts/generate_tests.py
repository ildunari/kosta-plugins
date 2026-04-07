#!/usr/bin/env python3
"""
Generate Swift test templates (Swift Testing or XCTest) for a given Swift file.

Usage:
  # Swift Testing (Xcode 16+)
  python3 generate_tests.py --style swift-testing --module MyApp \
    --input Sources/MyApp/UserService.swift \
    --out Tests/MyAppTests/UserServiceTests.swift

  # XCTest (Xcode 15+)
  python3 generate_tests.py --style xctest --module MyApp \
    --input Sources/MyApp/UserService.swift \
    --out Tests/MyAppTests/UserServiceTests.swift

This is a pragmatic, regex-based parser that finds public/internal types and functions
and emits AAA-structured tests. Treat output as a scaffold to edit, not production code.

Version: 1.1.0
Last Updated: 2025-10-28
"""

import argparse
import re
import pathlib
from typing import List, Tuple, Optional

# Swift Testing templates (Xcode 16+)
SWIFT_TESTING_HEADER = """import Testing
@testable import {module}

@Suite("{type_name} tests")
struct {type_name}Tests {{
{tests}
}}
"""

SWIFT_TESTING_ASYNC_TEST = """    @Test("{method_name} – happy path")
    func {safe_method_name}_happyPath() async throws {{
        // Arrange
        let sut = {type_name}()
        
        // Act
        // let result = try await sut.{method_name}(...)
        
        // Assert
        #expect(true) // Replace with actual expectation
    }}
"""

SWIFT_TESTING_SYNC_TEST = """    @Test("{method_name} – happy path")
    func {safe_method_name}_happyPath() throws {{
        // Arrange
        let sut = {type_name}()
        
        // Act
        // let result = try sut.{method_name}(...)
        
        // Assert
        #expect(true) // Replace with actual expectation
    }}
"""

# XCTest templates (Xcode 15+)
XCTEST_HEADER = """import XCTest
@testable import {module}

final class {type_name}Tests: XCTestCase {{
{tests}
}}
"""

XCTEST_ASYNC_TEST = """    func test_{safe_method_name}_happyPath() async throws {{
        // Arrange
        let sut = {type_name}()
        
        // Act
        // let result = try await sut.{method_name}(...)
        
        // Assert
        XCTAssertTrue(true) // Replace with actual assertion
    }}
"""

XCTEST_SYNC_TEST = """    func test_{safe_method_name}_happyPath() throws {{
        // Arrange
        let sut = {type_name}()
        
        // Act
        // let result = try sut.{method_name}(...)
        
        // Assert
        XCTAssertTrue(true) // Replace with actual assertion
    }}
"""

def find_types_and_funcs(source: str) -> Tuple[List[Tuple[str, str]], List[Tuple[str, bool, bool]]]:
    """
    Parse Swift source to find types and their functions.
    
    Returns:
        Tuple of (types, functions) where:
        - types: [(kind, name), ...] e.g. [('class', 'UserService'), ...]
        - functions: [(name, is_async, is_throws), ...] e.g. [('fetchUser', True, True), ...]
    """
    # Find type declarations (class, struct, enum, actor)
    type_pattern = re.compile(
        r'^\s*'
        r'(?:public\s+|internal\s+|private\s+|fileprivate\s+)?'
        r'(?:final\s+)?'
        r'(class|struct|enum|actor)\s+'
        r'([A-Za-z_]\w*)',
        re.MULTILINE
    )
    types = [(m.group(1), m.group(2)) for m in type_pattern.finditer(source)]
    
    # Find function declarations
    func_pattern = re.compile(
        r'^\s*'
        r'(?:public\s+|internal\s+|private\s+|fileprivate\s+)?'
        r'(?:static\s+)?'
        r'(?:mutating\s+)?'
        r'(async\s+)?'  # Group 1: async
        r'(throws\s+)?'  # Group 2: throws
        r'func\s+'
        r'([A-Za-z_]\w*)'  # Group 3: function name
        r'\s*\(',
        re.MULTILINE
    )
    
    funcs = []
    for m in func_pattern.finditer(source):
        name = m.group(3)
        is_async = bool(m.group(1))
        is_throws = bool(m.group(2))
        funcs.append((name, is_async, is_throws))
    
    return types, funcs

def sanitize_method_name(name: str) -> str:
    """Convert method name to safe test method name."""
    # Remove special characters, keep alphanumeric and underscores
    safe = re.sub(r'[^a-zA-Z0-9_]', '', name)
    return safe

def generate_swift_testing_test(
    method_name: str,
    is_async: bool,
    is_throws: bool,
    type_name: str
) -> str:
    """Generate a Swift Testing test for a method."""
    safe_name = sanitize_method_name(method_name)
    
    if is_async:
        return SWIFT_TESTING_ASYNC_TEST.format(
            method_name=method_name,
            safe_method_name=safe_name,
            type_name=type_name
        )
    else:
        return SWIFT_TESTING_SYNC_TEST.format(
            method_name=method_name,
            safe_method_name=safe_name,
            type_name=type_name
        )

def generate_xctest_test(
    method_name: str,
    is_async: bool,
    is_throws: bool,
    type_name: str
) -> str:
    """Generate an XCTest test for a method."""
    safe_name = sanitize_method_name(method_name)
    
    if is_async:
        return XCTEST_ASYNC_TEST.format(
            method_name=method_name,
            safe_method_name=safe_name,
            type_name=type_name
        )
    else:
        return XCTEST_SYNC_TEST.format(
            method_name=method_name,
            safe_method_name=safe_name,
            type_name=type_name
        )

def main():
    parser = argparse.ArgumentParser(
        description='Generate Swift test templates (Swift Testing or XCTest)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Swift Testing (recommended for Xcode 16+)
  %(prog)s --style swift-testing --module MyApp \\
    --input Sources/MyApp/UserService.swift \\
    --out Tests/MyAppTests/UserServiceTests.swift
  
  # XCTest (for Xcode 15 or legacy projects)
  %(prog)s --style xctest --module MyApp \\
    --input Sources/MyApp/UserService.swift \\
    --out Tests/MyAppTests/UserServiceTests.swift
        """
    )
    
    parser.add_argument(
        '--style',
        choices=['swift-testing', 'xctest'],
        required=True,
        help='Testing framework: swift-testing (Xcode 16+) or xctest (Xcode 15+)'
    )
    parser.add_argument(
        '--module',
        required=True,
        help='Module name to import in tests'
    )
    parser.add_argument(
        '--input',
        required=True,
        help='Path to Swift source file to generate tests for'
    )
    parser.add_argument(
        '--out',
        required=True,
        help='Output path for generated test file'
    )
    parser.add_argument(
        '--max-tests',
        type=int,
        default=8,
        help='Maximum number of test methods to generate (default: 8)'
    )
    
    args = parser.parse_args()
    
    # Read source file
    input_path = pathlib.Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {args.input}")
        return 1
    
    source = input_path.read_text(encoding='utf-8', errors='ignore')
    
    # Parse source
    types, funcs = find_types_and_funcs(source)
    
    # Determine type name
    if types:
        type_kind, type_name = types[0]
        print(f"Found {type_kind}: {type_name}")
    else:
        type_name = input_path.stem
        print(f"No type found, using filename: {type_name}")
    
    # Generate tests
    if funcs:
        print(f"Found {len(funcs)} methods")
        funcs_to_test = funcs[:args.max_tests]
        if len(funcs) > args.max_tests:
            print(f"Limiting to {args.max_tests} tests")
    else:
        print("No methods found, generating empty test suite")
        funcs_to_test = []
    
    test_bodies = []
    for method_name, is_async, is_throws in funcs_to_test:
        if args.style == 'swift-testing':
            test = generate_swift_testing_test(method_name, is_async, is_throws, type_name)
        else:
            test = generate_xctest_test(method_name, is_async, is_throws, type_name)
        test_bodies.append(test)
    
    # Generate output
    if args.style == 'swift-testing':
        content = SWIFT_TESTING_HEADER.format(
            module=args.module,
            type_name=type_name,
            tests=''.join(test_bodies) if test_bodies else '    // TODO: Add tests\n'
        )
    else:
        content = XCTEST_HEADER.format(
            module=args.module,
            type_name=type_name,
            tests=''.join(test_bodies) if test_bodies else '    // TODO: Add tests\n'
        )
    
    # Write output
    output_path = pathlib.Path(args.out)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding='utf-8')
    
    print(f"\n✅ Generated {args.style} tests: {output_path}")
    print(f"   Module: {args.module}")
    print(f"   Type: {type_name}")
    print(f"   Tests: {len(test_bodies)}")
    
    if args.style == 'swift-testing':
        print("\n💡 Next steps:")
        print("   1. Review and customize generated tests")
        print("   2. Replace placeholder assertions with real expectations")
        print("   3. Add @Test tags if needed: .tags(.critical)")
        print("   4. Consider parameterized tests for similar cases")
    else:
        print("\n💡 Next steps:")
        print("   1. Review and customize generated tests")
        print("   2. Replace placeholder assertions with real assertions")
        print("   3. Consider migrating to Swift Testing (Xcode 16+)")
    
    return 0

if __name__ == '__main__':
    exit(main())
